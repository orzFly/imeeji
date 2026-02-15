{ inputs, ... }:

{
  system = "x86_64-linux";
  format = "qcow";

  imports = [
    inputs.quadlet-nix.nixosModules.quadlet
    inputs.sops-nix.nixosModules.sops

    ({ config, pkgs, ... }:
      let
        inherit (config.virtualisation.quadlet) networks containers pods;
      in
      {
        sops.defaultSopsFile = "${inputs.self.outPath}/secrets/hosts/a2/default.yaml";

        system.stateVersion = "25.11";
        orz.minimal = true;

        virtualisation.quadlet.containers.postgres = {
          containerConfig = {
            image = "docker.io/library/postgres:18.1-alpine";
          };
        };

        virtualisation.quadlet.containers.axonhub = {
          containerConfig = {
            publishPorts = [ "8090:8090" ];
            image = "docker.io/looplj/axonhub:v0.9.5";
          };
        };

        virtualisation.quadlet.containers.redis = {
          containerConfig = {
            image = "docker.io/library/redis:8-alpine";
            volumes = [
              "/srv/redis:/data"
            ];
            exec = "redis-server --save 60 1 --appendonly yes --appendfsync everysec";
            healthCmd = "redis-cli ping";
            healthInterval = "10s";
            healthTimeout = "5s";
            healthRetries = 5;
            healthStartPeriod = "5s";
            notify = "healthy";
            networks = [ networks.internal.ref ];
          };
          serviceConfig = {
            Restart = "always";
          };
        };

        virtualisation.quadlet.containers.sub2api = {
          containerConfig = {
            image = "docker.io/weishaw/sub2api:0.1.81";
            publishPorts = [ "8080:8080" ];
            volumes = [
              "/srv/sub2api:/app/data"
            ];
          };
          unitConfig = {
            Requires = [ containers.postgres.ref containers.redis.ref ];
            After = [ containers.postgres.ref containers.redis.ref ];
          };
          serviceConfig = {
            Restart = "always";
          };
        };

        virtualisation.quadlet.containers.immich = {
          containerConfig = {
            image = "ghcr.io/imagegenius/immich:openvino-v2.4.1-ig137";
          };
        };

      })
  ];
}
