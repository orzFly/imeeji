import * as pulumi from '@pulumi/pulumi'
import * as random from '@pulumi/random'
import { DirectoryResource, FileResource, InitialFileResource, ZfsFilesystemResource } from '../../ansible'
import { PodComponent, PodContainerConfig } from '../base/container'

interface Address {
  ip: string
  port: number
}

export class HighAvailablityRedisSentinelComponent extends pulumi.ComponentResource {
  public constructor(
    name: string,
    config: {
      name?: string
      hosts: { host: string; podIp: string }[]
      masterPass: pulumi.Input<string>
      proxyIp: string
      keepalivedRouterId: number
      extraUsers?: Record<
        string,
        {
          password: pulumi.Input<string>
          permissions: string[]
        }
      >
    },
    opts: pulumi.ComponentResourceOptions,
  ) {
    const tag = 'corehome:HighAvailablityRedisSentinelComponent'
    super(tag, name, {}, opts)

    const serverMasterUser = 'rdpmaster'

    const serverReplicaUser = 'rdpreplica'
    const serverReplicaPassword = new random.RandomPassword(`${name}-server-replica-pass`, {
      length: 64,
      special: false,
    })

    const serverSentinelUser = 'rdpsentinel'
    const serverSentinelPassword = new random.RandomPassword(`${name}-server-sentinel-pass`, {
      length: 64,
      special: false,
    })

    const sentinelMasterUser = 'rdpsmaster'
    const sentinelMasterPassword = new random.RandomPassword(`${name}-sentinel-master-pass`, {
      length: 64,
      special: false,
    })

    const keepalivedPassword = new random.RandomPassword(`${name}-keepalived-pass`, {
      length: 16,
      special: false,
    })

    const serverPort = 16379
    const sentinelPort = 26379
    const sentinelName = 'mymaster'

    let index = 0
    const hostIndexLength = config.hosts.length.toString().length
    let masterEndpoint!: Address
    const slaveEndpoints: Address[] = []
    for (const host of config.hosts) {
      index++
      const hostIndex = `${index.toString().padStart(hostIndexLength, '0')}`
      const rname = (s: string) => `${name}-${host.host}-${s}`
      const podname = `${name}${hostIndex}`

      const pvc = new ZfsFilesystemResource(
        rname('pvc'),
        {
          host: host.host,
          pool: 'rpool',
          name: `VOL/${podname}`,
        },
        { parent: this },
      )

      const containers = {} as Record<string, PodContainerConfig>

      const master = index === 1
      if (master) {
        masterEndpoint = { ip: host.podIp, port: serverPort }
      } else {
        slaveEndpoints.push({ ip: host.podIp, port: serverPort })
      }

      {
        const dataDir = new DirectoryResource(
          rname(`data-dir`),
          {
            host: host.host,
            path: pvc.mountPointJoin(`redis-data`),
            owner: '999',
            group: '999',
          },
          { parent: this, dependsOn: pvc },
        )

        const configDir = new DirectoryResource(
          rname(`config-dir`),
          {
            host: host.host,
            path: pvc.mountPointJoin(`redis-config`),
          },
          { parent: this, dependsOn: pvc },
        )

        new InitialFileResource(
          rname(`redis.conf`),
          {
            host: host.host,
            initialContent: pulumi
              .all([
                `aclfile /usr/local/etc/redis/redis.acl.conf`,
                `include /usr/local/etc/redis/redis.include.conf`,
                ...(master ? [] : [`replicaof ${masterEndpoint.ip} ${masterEndpoint.port}`]),
              ])
              .apply((t) => t.join('\n')),
            dest: configDir.pathJoin('redis.conf'),
          },
          { parent: this, dependsOn: configDir },
        )

        const redisConfig = [
          `port ${serverPort}`,
          `appendonly yes`,
          `replica-announce-ip ${host.podIp}`,
          `replica-announce-port ${serverPort}`,
          `replica-serve-stale-data no`,
          `replica-read-only yes`,
          `min-replicas-to-write 1`,
          `min-replicas-max-lag 10`,
          pulumi.interpolate`masteruser ${serverReplicaUser}`,
          pulumi.interpolate`masterauth ${serverReplicaPassword.result}`,
        ]

        const configFile = new FileResource(
          rname(`redis.include.conf`),
          {
            host: host.host,
            content: pulumi.all(redisConfig).apply((t) => t.join('\n')),
            dest: configDir.pathJoin('redis.include.conf'),
          },
          { parent: this, dependsOn: configDir },
        )

        const aclFile = new FileResource(
          rname(`redis.acl.conf`),
          {
            host: host.host,
            content: pulumi
              .all([
                `user default off`,
                pulumi.interpolate`user ${serverMasterUser} reset on allkeys allchannels allcommands >${config.masterPass}`,
                pulumi.interpolate`user ${serverReplicaUser} reset on +psync +replconf +ping >${serverReplicaPassword.result}`,
                pulumi.interpolate`user ${serverSentinelUser} reset on allchannels +multi +slaveof +ping +exec +subscribe +config|rewrite +role +publish +info +client|setname +client|kill +script|kill >${serverSentinelPassword.result}`,
                ...Object.entries(config.extraUsers || {}).map(([user, { password, permissions }]) => {
                  return pulumi.interpolate`user ${user} reset on ${permissions.join(' ')} >${password}`
                }),
              ])
              .apply((t) => t.join('\n')),
            dest: configDir.pathJoin('redis.acl.conf'),
          },
          { parent: this, dependsOn: configDir },
        )

        containers[`redis-server`] = {
          image: 'docker.io/library/redis:7.2',
          volumes: [
            { hostPath: dataDir.path, containerPath: '/data' },
            { hostPath: configDir.path, containerPath: '/usr/local/etc/redis' },
          ],
          command: ['redis-server', '/usr/local/etc/redis/redis.conf'],
          triggers: [configFile.contentSha256sum, aclFile.contentSha256sum],
        }
      }

      {
        const dataDir = new DirectoryResource(
          rname(`sentinel-data-dir`),
          {
            host: host.host,
            path: pvc.mountPointJoin(`sentinel-redis-data`),
            owner: '999',
            group: '999',
          },
          { parent: this, dependsOn: pvc },
        )

        const configDir = new DirectoryResource(
          rname(`sentinel-config-dir`),
          {
            host: host.host,
            path: pvc.mountPointJoin(`sentinel-redis-config`),
            owner: '999',
            group: '999',
          },
          { parent: this, dependsOn: pvc },
        )

        const redisConfig = [
          `port ${sentinelPort}`,
          `sentinel monitor ${sentinelName} ${masterEndpoint.ip} ${masterEndpoint.port} 2`,
          `sentinel down-after-milliseconds ${sentinelName} 10000`,
          `sentinel failover-timeout ${sentinelName} 20000`,
          `sentinel parallel-syncs ${sentinelName} 1`,
          `sentinel auth-user ${sentinelName} ${serverSentinelUser}`,
          pulumi.interpolate`sentinel auth-pass ${sentinelName} ${serverSentinelPassword.result}`,
          `sentinel announce-ip ${host.podIp}`,
          `sentinel announce-port ${sentinelPort}`,
          `sentinel sentinel-user ${sentinelMasterUser}`,
          pulumi.interpolate`sentinel sentinel-pass ${sentinelMasterPassword.result}`,
        ]

        new InitialFileResource(
          rname(`sentinel-redis-sentinel.conf`),
          {
            host: host.host,
            initialContent: pulumi
              .all([
                `aclfile /usr/local/etc/redis/redis-sentinel.acl.conf`,
                `include /usr/local/etc/redis/redis-sentinel.include.conf`,
                ...redisConfig,
              ])
              .apply((t) => t.join('\n')),
            dest: configDir.pathJoin('redis-sentinel.conf'),
            owner: '999',
            group: '999',
          },
          { parent: this, dependsOn: configDir },
        )

        const includeFile = new FileResource(
          rname(`sentinel-redis-sentinel.include.conf`),
          {
            host: host.host,
            content: pulumi.all([]).apply((t) => t.join('\n')),
            dest: configDir.pathJoin('redis-sentinel.include.conf'),
            owner: '999',
            group: '999',
          },
          { parent: this, dependsOn: configDir },
        )

        const aclFile = new FileResource(
          rname(`sentinel-redis-sentinel.acl.conf`),
          {
            host: host.host,
            content: pulumi
              .all([
                `user default reset on nopass -@all +auth +client|getname +client|id +client|setname +command +hello +ping +role +sentinel|get-master-addr-by-name +sentinel|master +sentinel|myid +sentinel|replicas +sentinel|sentinels`,
                pulumi.interpolate`user ${sentinelMasterUser} reset on allchannels +@all >${sentinelMasterPassword.result}`,
              ])
              .apply((t) => t.join('\n')),
            dest: configDir.pathJoin('redis-sentinel.acl.conf'),
          },
          { parent: this, dependsOn: configDir },
        )

        containers[`redis-sentinel`] = {
          image: 'docker.io/library/redis:7.2',
          volumes: [
            { hostPath: dataDir.path, containerPath: '/data' },
            { hostPath: configDir.path, containerPath: '/usr/local/etc/redis' },
          ],
          command: ['redis-server', '/usr/local/etc/redis/redis-sentinel.conf', '--sentinel'],
          triggers: [includeFile.contentSha256sum, aclFile.contentSha256sum],
        }
      }

      containers[`redis-proxy`] = {
        image: 'docker.io/flant/redis-sentinel-proxy:v2.0.3',
        command: [
          '-listen',
          ':6379',
          '-sentinel',
          `127.0.0.1:${sentinelPort}`,
          '-master',
          sentinelName,
          '--resolve-retries',
          '30',
        ],
        depends: ['redis-sentinel'],
      }

      containers[`proxy-keepalived`] = {
        image: 'docker.io/osixia/keepalived:2.0.20',
        depends: ['redis-proxy'],
        capsAdd: ['NET_ADMIN', 'NET_BROADCAST', 'NET_RAW'],
        env: {
          KEEPALIVED_INTERFACE: `eth0`,
          KEEPALIVED_PASSWORD: keepalivedPassword.result,
          KEEPALIVED_PRIORITY: `${100 - index}`,
          KEEPALIVED_ROUTER_ID: `${config.keepalivedRouterId}`,
          KEEPALIVED_UNICAST_PEERS:
            `#JSON2BASH:` +
            JSON.stringify([...config.hosts.map((h) => (h !== host ? h.podIp : null)).filter((h) => h !== null)]),
          KEEPALIVED_VIRTUAL_IPS: config.proxyIp,
          KEEPALIVED_STATE: master ? 'MASTER' : `BACKUP`,
        },
      }

      new PodComponent(
        rname('pod'),
        {
          name: podname,
          host: host.host,
          ip: host.podIp,
          containers,
        },
        { parent: this },
      )
    }

    this.serverMasterEndpoint = pulumi.output(masterEndpoint)
    this.serverSlaveEndpoints = pulumi.output(slaveEndpoints)
    this.serverMasterUser = pulumi.output(serverMasterUser)
    this.serverMasterPass = pulumi.output(config.masterPass)
    this.serverReplicaUser = pulumi.output(serverReplicaUser)
    this.serverReplicaPass = pulumi.output(serverReplicaPassword.result)
    this.serverSentinelUser = pulumi.output(serverSentinelUser)
    this.serverSentinelPass = pulumi.output(serverSentinelPassword.result)

    this.sentinelEndpoints = pulumi.output(config.hosts.map((h) => ({ ip: h.podIp, port: sentinelPort })))
    this.sentinelName = pulumi.output(sentinelName)
    this.sentinelMasterUser = pulumi.output(sentinelMasterUser)
    this.sentinelMasterPass = pulumi.output(sentinelMasterPassword.result)

    this.proxyEndpoint = pulumi.output({ ip: config.proxyIp, port: 6379 })

    this.registerOutputs()
  }

  public readonly serverMasterEndpoint!: pulumi.Output<Address>
  public readonly serverSlaveEndpoints!: pulumi.Output<Address[]>
  public readonly serverMasterUser!: pulumi.Output<string>
  public readonly serverMasterPass!: pulumi.Output<string>
  public readonly serverReplicaUser!: pulumi.Output<string>
  public readonly serverReplicaPass!: pulumi.Output<string>
  public readonly serverSentinelUser!: pulumi.Output<string>
  public readonly serverSentinelPass!: pulumi.Output<string>

  public readonly sentinelEndpoints!: pulumi.Output<Address[]>
  public readonly sentinelName!: pulumi.Output<string>
  public readonly sentinelMasterUser!: pulumi.Output<string>
  public readonly sentinelMasterPass!: pulumi.Output<string>

  public readonly proxyEndpoint!: pulumi.Output<Address>
}
