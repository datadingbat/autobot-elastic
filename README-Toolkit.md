# Elasticsearch Service Management Toolkit

A comprehensive set of interactive utilities for managing Elasticsearch, Kibana, and Beat services across multiple hosts. The toolkit provides intuitive, menu-driven access to common operational tasks while implementing sophisticated status tracking and reporting.

## Overview

The toolkit provides interactive management of Elastic services through a menu-driven interface, handling everything from basic service operations to complex multi-host installations and upgrades.

### Key Features
- Interactive service management
- Multi-host operations
- Comprehensive status reporting
- Smart error handling and recovery
- Support for both online and airgapped environments

### Quick Start

1. Run the toolkit:
```bash
ansible-playbook es-toolkit.yml -i inventory.ini
```

2. Navigate the menu system:
```
Available Operations:
1. Get Service State
2. Change Service State
3. Install Service
4. Upgrade Service
5. Remove Service
6. Tune Service

Select an operation [1-6]:
```

3. Select your target hosts:
```
Target Selection:
1. All Hosts
2. Host Group
3. Single Host

Select targeting method [1-3]:
```

## Technical Summary

### Core Functions

1. **Service State Management**
   - Real-time service status monitoring
   - Package installation verification
   - Configuration validation
   - Resource usage tracking
   - Log analysis and reporting

2. **Service Operations**
   - Installation (APT or local package)
   - Start/Stop/Restart
   - Version upgrades
   - Complete removal
   - System tuning

3. **Status Reporting**
   - Comprehensive service state
   - Multi-host aggregation
   - Resource utilization
   - Error detection
   - Configuration validation

4. **Host Management**
   - Flexible targeting options
   - Pre-flight validation
   - Status-based execution control
   - Error handling and recovery

### Special Features

1. **Installation Methods**
   - APT repository with version selection
   - Local .deb package support for airgapped environments
   - Pre-flight system validation
   - Post-installation verification

2. **Service-Specific Enhancements**
   - Elasticsearch cluster awareness
   - API health checking
   - Certificate management
   - Configuration validation

3. **System Tuning**
   - Memory limit configuration
   - System parameters optimization
   - JVM heap size management
   - Disk and network settings

## Technical Implementation

### Architecture

1. **Two-Play System**
   - Play 1: Variable setup and target selection (localhost)
   - Play 2: Utility execution (on target hosts)

2. **Menu Structure**
   - Main menu → Operation type
   - Operation → Service selection
   - Service → Target selection
   - Installation special case → Method selection

3. **Status Management**
   - Real-time state collection
   - Multi-host aggregation
   - Status-based execution control
   - Comprehensive reporting

### Core Strategies

1. **Execution Flow**
   ```
   Input Validation → Pre-flight Checks → Status Collection → 
   Operation Execution → Status Verification → Reporting
   ```

2. **Error Handling**
   - Comprehensive pre-flight validation
   - Multi-stage error catching
   - Graceful failure handling
   - Recovery guidance
   - Clear error reporting

3. **Report Generation**
   - Centralized processing
   - Standardized formatting
   - Multi-host aggregation
   - Clear visual hierarchy
   - Action recommendations

### Implementation Patterns

1. **Standard Utility Structure**
   ```yaml
   - Validate inputs
   - Check current state
   - Execute operation
   - Verify results
   - Generate report
   ```

2. **Status Collection**
   ```yaml
   - Package state
   - Service state
   - Configuration
   - Resource usage
   - Logs
   - API health (Elasticsearch)
   ```

3. **Report Format**
   ```
   SERVICE STATUS REPORT
   ====================
   COMMAND DETAILS
   ==============
   [operation info]

   STATUS DETAILS
   =============
   HOST: example.com
   ----------------
   [detailed status]

   SUMMARY
   =======
   [statistics]

   RECOMMENDATIONS
   ==============
   [action items]
   ```

### Safety Features

1. **Pre-execution Validation**
   - Required variable checking
   - System requirement verification
   - Network access validation
   - File access checking

2. **Operation Safety**
   - Explicit confirmation for destructive operations
   - Status-based execution gates
   - Rollback capabilities
   - Operation idempotency

3. **Error Prevention**
   - Type validation
   - Path verification
   - Permission checking
   - Network connectivity testing

## Contributing

Issues and pull requests are welcome. Please ensure new utilities follow the established patterns for consistency.

## License

[MIT License](LICENSE)
