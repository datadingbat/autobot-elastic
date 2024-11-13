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

* Python 3.x
* Ansible 2.9+
* SSH Keypair authentication support (See Step 6 in Quick Start below)
* For CloudFormation automation, you'll also need:
* * A valid EC2 key pair
* * AWS CLI configured with appropriate credentials
* * Your IP address for security group configuration

## Quick Start

1. Clone the repository:
```bash
git clone https://github.com/yourusername/autobot.git
cd autobot
```

2. (Optional - if using CloudFormation) Customize the CloudFormation template:
* Find/Replace all $username$ $project$ values as per your environment.
* Update/Remove all Tag Keys as per your environment
```bash
UserData sections of EC2 Instance Configurations:
--filters "Name=tag:Name,Values=$username$-$project$-kibana-node"  <---- UPDATE THIS

Tags:
        - Key: Name
          Value: $username$-$project$-vpc  <---- UPDATE THIS
        - Key: division
          Value: field
        - Key: org
          Value: sa
        - Key: team
          Value: amer-strat
        - Key: project
          Value: $username$-$project$  <---- UPDATE THIS
```

3. (Optional - if using CloudFormation)  Deploy the CloudFormation stack:
```bash
aws cloudformation create-stack \
  --stack-name autobot-elastic \
  --template-body file://cloudformation.yaml \
  --parameters ParameterKey=KeyName,ParameterValue=YOUR_KEY_NAME \
               ParameterKey=AdminIP,ParameterValue=YOUR_IP_CIDR \
  --capabilities CAPABILITY_IAM
```

4. (Optional) Update playbook/roles/elasticsearch/tasks/main.yml with custom values as needed
 Find the stanza "Set certificate password fact" and change es_cert_pass if you want a custom value
* * Note if you change es_cert_pass here, you also must change it in playbook/roles/kibana/tasks/main.yml with the same value
* Find the stanza "Set s3 secret key fact" and change s3_client_secret_key to match your s3 provider (minIO, others) spec
* Find the stanza "Set s3 access key fact" and change s3_client_access_key to match your s3 provider (minIO, others) spec

```bash
    - name: Set certificate password fact
      set_fact:
        es_cert_pass: "elastic2024"
        
    - name: Set s3 secret key fact
      set_fact:
        s3_client_secret_key: "sample_secret_key"  <---- UPDATE THIS

    - name: Set s3 access key fact
      set_fact:
        s3_client_access_key: "sample_access_key"  <---- UPDATE THIS
```

5. Generate or modify inventory.ini:
* If you created your cluster manually, you should customize playbook/inventory.ini with your cluster hostnames & private key file at the bottom
* If your cluster was built with Cloudformation in steps 2&3 above, run the provided script utils/gen-inventory.sh to generate inventory.ini based on EC2 tags
  * You'll need to replace "your-project" in gen-inventory.sh with the project name you used in the CloudFormation template
  * You may need to chmod it to be executable
```bash
Modify this line in inventory.ini with the full path to your private key file:

ansible_ssh_private_key_file=/home/ubuntu/.ssh/jessem-pp.pem
```

6. Set up SSH access on helper node:

* Update the utils/config with your private key file name and inventory hostnames/IP-ranges
* Copy the config file and priate key to the Ansible (helper) node, and set permissions
```bash
# ~/.ssh/config
# This is a ssh config file that's used to allow Ansible to perform automation tasks to the cluster
Host *.elastic.internal
    IdentityFile ~/.ssh/jessem-pp.pem <---- UPDATE THIS
    User ubuntu
    StrictHostKeyChecking no

Host *.amazonaws.com *.compute.internal ec2-* 10.* 3.* 18.*  <---- UPDATE THIS
    IdentityFile ~/.ssh/jessem-pp.pem   <---- UPDATE THIS
    User ubuntu

# Copy SSH config and key to helper node
# From the "utils" subdirectory of the playbook:
scp -rp config your-key.pem ubuntu@<HELPER_NODE_IP>:/home/ubuntu/.ssh/  <---- replace "your-key" and <HELPER_NODE_IP>
chmod 600 /home/ubuntu/.ssh/config /home/ubuntu/.ssh/your-key.pem  <---- replace "your-key"

# Test SSH Keypair authentication from your client machine to the Anisble helper node:
ssh -i your-key.pem ubuntu@<HELPER_NODE_IP>  <---- replace "your-key" and <HELPER_NODE_IP>
ssh ubuntu@<MASTER_NODE_INTERNAL_IP>  <---- replace <MASTER_NODE__IP>
```

7. (Optional) Customize the location where Elastic will store its data
* By default, and as specified in /etc/elasticsearch/elasticsearch.yml, Elastic will store data in: /var/lib/elasticsearch/
  * If you have a different location in mind (like a dedicated data array), you should modify playbook/roles/elasticsearch/tasks/main.yml:
```bash
# playbook/roles/elasticsearch/tasks/main.yml:

    - name: Create initial elasticsearch settings
      copy:
        dest: /etc/elasticsearch/elasticsearch.yml
        content: |
          # Elasticsearch configuration
          path.data: /var/lib/elasticsearch   <------ Change this value to the folder you want Elastic to store its data in
          path.logs: /var/log/elasticsearch
```


8. Deploy with Ansible:
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
│   └── roles/
│       ├── common/        # Common configurations
│       ├── elasticsearch/ # Elasticsearch setup
│       └── kibana/        # Kibana setup
├── utils/
│   ├── config             # .ssh/config example
│   ├── remove-es.yml      # Cleanup playbook
│   ├── tuning.yml         # OS Tuning playbook
```

## Contributing

Feel free to submit issues, fork the repository, and create pull requests for any improvements.

## License

[MIT License](LICENSE)
