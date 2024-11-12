# AUTOBOT (Automated Bootstrap Orchestration Tool)

An automated deployment solution for Elasticsearch clusters on AWS, combining CloudFormation infrastructure provisioning with Ansible configuration management.

⚠️ **Note:** This project is intended for development, testing, and demonstration purposes. Not recommended for production deployments.

## Overview

AUTOBOT automates the deployment of a complete Elasticsearch cluster with:
* (3) dedicated master nodes
* (4) hot nodes for active data
* (2) frozen nodes for historical data
* Helper node running:
  * MinIO for S3-compatible storage
  * Kibana for visualization
  * Ansible control node
* Load balancer for cluster access
* Private DNS zone for service discovery

Note: Number of nodes is customizable, these are just the default values.

## Architecture

### Infrastructure: AWS CloudFormation
* VPC with public subnets
* EC2 instances:
  * Master/Data nodes: m6i.16xlarge
  * Helper node: t3.xlarge (runs Ansible, Kibana, MinIO)
* Application Load Balancer
* Route 53 private hosted zone
* S3 bucket for frozen indices
* Security groups and IAM roles

### Configuration: Ansible
* Automated Elasticsearch installation and configuration
* SSL/TLS certificate management
* Cluster bootstrap and node enrollment
* Kibana setup and integration
* MinIO deployment and configuration

## Prerequisites

* AWS CLI configured with appropriate credentials
* Python 3.x
* Ansible 2.9+
* A valid EC2 key pair
* Your IP address for security group configuration

## Quick Start

1. Clone the repository:
```bash
git clone https://github.com/yourusername/autobot.git
cd autobot
```

2. Deploy the CloudFormation stack:
```bash
aws cloudformation create-stack \
  --stack-name autobot-elastic \
  --template-body file://cloudformation.yaml \
  --parameters ParameterKey=KeyName,ParameterValue=YOUR_KEY_NAME \
               ParameterKey=AdminIP,ParameterValue=YOUR_IP_CIDR \
  --capabilities CAPABILITY_IAM
```

3. Generate inventory.ini:
```bash
# Run the provided script to generate inventory.ini based on EC2 tags
./generate-inventory.sh
```

4. Set up SSH access on helper node:
```bash
# Copy SSH config and key to helper node
scp -rp config jessem-pp.pem ubuntu@<HELPER_NODE_IP>:/home/ubuntu/.ssh/
chmod 600 /home/ubuntu/.ssh/config /home/ubuntu/.ssh/jessem-pp.pem
```

5. Deploy with Ansible:
```bash
cd playbook
ansible-playbook -i inventory.ini playbook.yml
```

## Components

### Helper Node
* Acts as Ansible control node
* Runs MinIO server for S3-compatible storage
* Runs Kibana for visualization
* Handles certificate management

### Master Nodes
* Dedicated cluster coordination
* Certificate authority
* Cluster state management

### Hot Nodes
* Active data storage
* Search and indexing

### Frozen Nodes
* Historical data storage
* Integrated with MinIO for cost-effective storage

## Security

* Private VPC network
* Security groups limiting access to specified IP
* Internal TLS/SSL encryption
* Authentication enabled by default
* Private DNS for internal service discovery

## Access Points

After deployment, you can access:
* Elasticsearch: `https://<load-balancer-dns>:9200`
* Kibana: `https://<helper-node-dns>:5601`
* MinIO Server: `http://<helper-node-dns>:9000`
* MinIO Console: `http://<helper-node-dns>:9001`

## Stack Management

View stack status:
```bash
aws cloudformation describe-stacks --stack-name autobot-elastic
```

View stack events (troubleshooting):
```bash
aws cloudformation describe-stack-events --stack-name autobot-elastic
```

Clean up resources:
```bash
# Remove the CloudFormation stack
aws cloudformation delete-stack --stack-name autobot-elastic

# Wait for stack deletion to complete
aws cloudformation wait stack-delete-complete --stack-name autobot-elastic
```

## Project Structure
```
autobot/
├── cloudformation.yaml     # AWS infrastructure template
├── generate-inventory.sh   # Script to generate Ansible inventory
├── playbook/
│   ├── inventory.ini      # Ansible inventory
│   ├── playbook.yml       # Main playbook
│   ├── remove-es.yml      # Cleanup playbook
│   └── roles/
│       ├── common/        # Common configurations
│       ├── elasticsearch/ # Elasticsearch setup
│       └── kibana/        # Kibana setup
```

## Contributing

Feel free to submit issues, fork the repository, and create pull requests for any improvements.

## License

[MIT License](LICENSE)
