# AUTOBOT (Automated Bootstrap Orchestration Tool)

AUTOBOT is an automated deployment solution for Elasticsearch clusters combining Anisible for Elastic installation & configuration, and CloudFormation for AWS infrastructure provisioning. 

The Ansible playbook is designed to be used independently from CloudFormation: you are welcome to ignore the CloudFormation aspects of this project without any consequence. Additionally, the Ansible playbook is written for Debian/Ubuntu linux, but the "Configuration: Ansible" section of the readme below explains what to modify to support other linux flavors, as well as environments with restricted network access (local package installs). 

⚠️ **Note:** This project is intended for development, testing, and demonstration purposes. Not recommended for production deployments.

## Overview

AUTOBOT automates the deployment of a complete Elasticsearch cluster with:
* dedicated master nodes
* hot nodes for active data
* frozen nodes for historical data
* Helper node (also Ansible controller) running:
  * Kibana for visualization
  * (TO DO) MinIO for S3-compatible storage
* Load balancer for cluster access (CloudFormation only)
* Private DNS zone for service discovery (CloudFormation only)

## Architecture

### Configuration: Ansible
Note: The elastic user password is dropped into ~/.elasticsearch/elastic_password.txt on the Ansible controller
* Automated Elasticsearch installation and configuration
  * The playbook is designed for Debian/Ubuntu with internet connectivity to enable adding the Elastic repo & 'apt install'
    * The 8.x version of Elastic/Kibana that is installed can be modified in the elasticsearch & kibana task main.ymls 
    * In order to install a non-8.x version, you'll need to modify the common task's main.yml (search for "8.x")
  * The common/elasticsearch/kibana tasks have commented-out sections for local package installation in restricted environments
  * If you are using a non-Debian/Ubuntu flavor, search for "apt" and "systemd" and update those functions are per your non-debian OS
    * roles/common/tasks/main.yml
    * roles/elasticsearch/tasks/main.yml
    * roles/kibana/tasks/main.yml
* HTTP & Transport certificate management (Self-Signed by the initial master node)
* Cluster bootstrap and node enrollment
* Kibana setup and integration
* MinIO deployment and configuration (TO DO)

### Infrastructure: AWS CloudFormation
* VPC with public subnets
* EC2 instances:
  * Master/Data nodes: m6i.16xlarge
  * Helper node: t3.xlarge (runs Ansible, Kibana, MinIO)
* Application Load Balancer
* Route 53 private hosted zone
* S3 bucket for frozen indices
* Security groups and IAM roles

### Utilities: Tuning & Removal
* playbook/utils/remove-es.yml can be used to remove all elastic components from the cluster. It does not undo OS changes made by tuning.yml
  * remove-es.yml assumes debian/ubuntu and installation/removal via apt, as well as systemd. If your environment doesn't match this, you'll need to update this file
* playbook/utils/tuning.yml is not executed as part of the default playbook.yml - it should be run AFTER playbook.xml is complted
  * tuning.yml should also be updated as per your specific environment - it has guidance in the comments at the top of the file, like:
    * Make sure to set your JVM heap size appropriately based on Elastic's official guidance: https://www.elastic.co/guide/en/elasticsearch/reference/current/advanced-configuration.html#set-jvm-heap-size
    * Search for "-Xms128g" and "-Xmx128g" in this file and replace with values appropriate for your environment.
    * Additionally, this assumes systemd is being used. If not, search for "systemd" here and update as per your environment.

## Prerequisites

* Python 3.x
* Ansible 2.9+
* SSH Keypair authentication support (See Step 6 in Quick Start below)
* For CloudFormation automation, you'll also need:
  * A valid EC2 key pair
  * AWS CLI configured with appropriate credentials
  * Your IP address for security group configuration

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


4. Generate or modify inventory.ini:
* If you created your cluster manually, you should customize the sample playbook/inventory.ini with your cluster hostnames & private key file at the bottom
* You must include the "ansible_host=" prefix as specified in the sample playbook/inventory.ini
* If your cluster was built with Cloudformation in steps 2&3 above, run the provided script utils/gen-inventory.sh to generate inventory.ini based on EC2 tags
  * You'll need to replace "your-project" in gen-inventory.sh with the project name you used in the CloudFormation template
  * You may need to chmod it to be executable
```bash
Modify this line in inventory.ini with the full path to your private key file:

ansible_ssh_private_key_file=/home/ubuntu/.ssh/your-key.pem   <---- UPDATE THIS
```

5. Set up SSH access on helper node:

* Update the utils/config with your private key file name and inventory hostnames/IP-ranges
* Copy the config file and private key to the Ansible (helper) node, and set permissions (pem file should be 400)
```bash
# ~/.ssh/config
# This is a ssh config file that's used to allow Ansible to perform automation tasks to the cluster
Host *.elastic.internal
    IdentityFile ~/.ssh/your-key.pem <---- UPDATE THIS
    User ubuntu
    StrictHostKeyChecking no

Host *.amazonaws.com *.compute.internal ec2-* 10.* 3.* 18.*  <---- UPDATE THIS
    IdentityFile ~/.ssh/your-key.pem   <---- UPDATE THIS
    User ubuntu

# Copy SSH config and key to helper node
# From the "utils" subdirectory of the playbook:
scp -rp config your-key.pem ubuntu@<HELPER_NODE_IP>:/home/ubuntu/.ssh/  <---- replace "your-key" and <HELPER_NODE_IP>
chmod 400 /home/ubuntu/.ssh/config /home/ubuntu/.ssh/your-key.pem  <---- replace "your-key"

# Test SSH Keypair authentication from your client machine to the Anisble helper node:
ssh -i your-key.pem ubuntu@<HELPER_NODE_IP>  <---- replace "your-key" and <HELPER_NODE_IP>
ssh ubuntu@<MASTER_NODE_INTERNAL_IP>  <---- replace <MASTER_NODE__IP>
```

6. Deploy a complete cluster (master+hot+frozen currently supported):
```bash
cd playbook
ansible-playbook -i inventory.ini deploy_cluster.yml
```
* Follow the prompts

7. Manage your cluster with the toolkit:
```bash
cd playbook
ansible-playbook -i inventory.ini es-toolkit.yml
```
* Follow the prompts

8. (Recommended) Environment Tuning:
* Tuning is offered in both the deploy_cluster & es-toolkit playsbooks.
  * You should verify and modify references to "heap", "apt", and "systemd" in this file, as per your environment
  * Heap size guidance can be found here: https://www.elastic.co/guide/en/elasticsearch/reference/current/advanced-
  
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
UPDATE ME
```

#V2 Info

## Core Architecture
* Two-play system in es-toolkit.yml:
  * Play 1: Variable setup and target selection (localhost)
  * Play 2: Utility execution (on target hosts)
* Menu-driven utility selection with three-level mapping:
  * Main menu → utility type
  * Utility type → utility file
  * Special case for installations with sub-mapping
* Uses task inclusion for utilities rather than roles
* Centralized variable passing via `selected_play_vars`
* Each utility maintains its own variable requirements and validation

## Main Menu Structure
1. Get Service State
2. Change Service State
3. Install Service
   * Sub-options:
     - Elasticsearch
     - Kibana
     - Filebeat
     - Metricbeat
     - Monitoring Instance
   * Installation method:
     - APT repository (with version selection)
     - Manual .deb package (with path input)
4. Upgrade Service
5. Remove Service
6. Tune Service

## Host Targeting System
* Supports three targeting methods:
  * All hosts (with safety confirmations)
  * Host groups (with inventory display)
  * Single host (by name or inventory browser)
* Handles both simple hostnames and FQDNs
* Displays host details in format: hostname (FQDN)
* Validates targets against inventory before execution
* Requires explicit confirmation after displaying target hosts
* Supports cancellation at confirmation prompts

## Enhanced Host Management
* Comprehensive host status tracking:
  * Package installation state detection
  * Service state verification
  * Configuration presence checking
  * State aggregation across host groups
* Multi-host operation handling:
  * Parallel status collection
  * Centralized status aggregation via hostvars
  * Status-based execution control
  * Group-wide operation coordination
* Installation eligibility management:
  * Pre-flight status verification
  * Skip conditions for existing installations
  * Clear reinstallation pathways
  * Group-based installation confirmation
* Status reporting enhancements:
  * Detailed per-host state information
  * Group-wide status summaries
  * Installation pathway recommendations
  * Clear upgrade/reinstall guidance

## Service Management
* Service selection for utilities 1, 2, and 5
* Comprehensive service state detection:
  * Standard states: active, inactive
  * Edge cases: not installed, active but improperly installed, failed
  * Detection includes both systemctl output and package installation status
  * Metadata capture: memory usage, active time, loaded state
  * Journal log integration for failed states
* Service operations validate pre and post states
* Installation method handling:
  * APT repository with version selection (latest/specific)
  * Manual .deb package installation for airgapped environments
  * Pre-flight validation for both methods

## Report Management
* Centralized on localhost for consistency and reliability
* Uses delegation pattern (`delegate_to: localhost` + `run_once: true`)
* Reports generated for all targeted hosts regardless of operation success
* Pre-execution status reports for destructive operations
* Post-execution status reports with detailed state information
* Standardized report formatting:
  * Clear section delineation
  * Host-specific status blocks
  * Installation state summaries
  * Action recommendations
* Key benefits:
  * Atomic file operations
  * Reliable cleanup
  * Consistent report aggregation
  * Resource efficiency on target hosts

## Implementation Patterns
* Standard utility structure:
  * Input validation block (required variables, state validation)
  * Status detection and reporting
  * Main execution block
  * Report generation block
* Host status management:
  * Initial status collection
  * Status aggregation on localhost
  * Status-based execution control
  * Status-driven reporting
* Certificate standardization:
  * Consistent /etc/service/certs structure
  * Centralized validation
  * Standard deployment methods
  * Permission standardization
* Temporary file management:
  * Central directory (/tmp/service_reports)
  * Cleanup in 'always' blocks
  * Error handling for failed cleanups
* Default variables where appropriate
* Clear separation between setup, execution, and reporting phases
* Certificate management for secure services
* Consistent confirmation patterns before destructive operations

## Error Handling
* Comprehensive pre-flight validation:
  * Required variables
  * Package prerequisites
  * System requirements
  * Network access (for APT installations)
  * File access (for manual installations)
* Multi-host validation:
  * Group-wide status verification
  * Installation eligibility checks
  * Status-based execution gates
  * Group operation validation
* Skip condition handling:
  * Graceful execution termination
  * Clear status messaging
  * Proper resource cleanup
  * Alternative action guidance
* Clear error messages for missing requirements
* Graceful handling of missing services/packages
* Support for force operations where appropriate
* Detailed status reporting for failed operations
* Clean rollback capabilities for failed installations
* Proper error propagation through delegation chains

## Special Cases
* Monitoring setup limited to single host
* Different fact gathering based on utility type
* Service-specific utilities (1,2,5) require additional validation
* Failed state detection triggers journal log collection
* Installation utilities require pre-flight checks and confirmation
* Certificate operations require validation of source files
* Airgapped installation support requires additional validation
* Multi-host operations:
  * Parallel status collection
  * Group-wide verifications
  * Consistent reporting across hosts
  * Group-level operation confirmations
* Status tracking:
  * Component-level verification
  * Cross-host status validation
  * Clear reinstallation paths
  * Status-based branching logic

## Modular Design
* Separate utility files for different installation types
* Consolidated removal and tuning functions
* Standard execution patterns:
  * Status-driven control flow
  * Host group coordination
  * Installation eligibility checking
  * Common reporting templates
* Reusable components:
  * Status collection blocks
  * Certificate management tasks
  * Report generation templates
  * Skip condition handling
* Consistent patterns across all utilities:
  * Variable handling
  * Status checking
  * Error management
  * Reporting structure
* Easy addition of new utilities while maintaining patterns

This implementation ensures consistent behavior across utilities while maintaining proper error handling, reporting, and resource management. Each utility maintains consistent patterns for user interaction and reporting while accommodating both online and airgapped environments.

The toolkit must handle both internet-connected and airgapped deployments, with appropriate safety checks and validations for each environment. All operations must be idempotent and provide clear feedback about their execution status and any errors encountered.

## Contributing

Feel free to submit issues, fork the repository, and create pull requests for any improvements.

## License

[MIT License](LICENSE)
