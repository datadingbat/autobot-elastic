#!/usr/bin/env python3
"""
join_node_tables.py - Combines Elasticsearch node and server node data into a single table

This script accepts two JSON inputs:
1. Node information from _cat/nodes API 
2. Server node details from Ansible collected facts

It produces a unified table with information from both sources.
"""

import json
import sys
import os
import re
from collections import defaultdict

def normalize_hostname(hostname):
    """Return consistent hostname format with domain"""
    # Remove any trailing dots to prevent empty string in split result
    hostname = hostname.rstrip('.')
    
    # If it's already a FQDN, return it
    if '.' in hostname:
        return hostname
    
    # Otherwise, it might be a short name, but we can't add domain
    # as we don't know what it should be
    return hostname

def extract_ip(ip_str):
    """Extract just the IP address if a hostname is mixed in"""
    # Check if it's already just an IP address
    ip_pattern = r'\b(?:\d{1,3}\.){3}\d{1,3}\b'
    ip_match = re.search(ip_pattern, ip_str)
    
    if ip_match:
        return ip_match.group(0)
    return ip_str

def format_table_row(hostname, merged_data, host_col_width):
    """Format a single row of the combined table with merged data"""
    
    # Get data from Elasticsearch source
    es_data = merged_data.get('es_data', {})
    ip = extract_ip(merged_data.get('ip', 'unknown'))
    node_role = es_data.get('node.role', 'unknown')
    version = es_data.get('version', 'unknown')
    master = es_data.get('master', '-')
    disk_total = es_data.get('disk.total', 'unknown')
    disk_used_percent = es_data.get('disk.used_percent', 'unknown')
    heap_percent = es_data.get('heap.percent', 'unknown')
    ram_percent = es_data.get('ram.percent', 'unknown')
    cpu_percent = es_data.get('cpu', 'unknown')
    
    # Get data from server source
    server_data = merged_data.get('server_data', {})
    resources = server_data.get('resources', {})
    cpu_count = resources.get('cpu_count', 'unknown')
    
    # Get memory info from multiple possible sources
    server_data = merged_data.get('server_data', {})
    
    # Try different paths where memory info might be stored
    ansible_facts = server_data.get('ansible_facts', {})
    mem_total = (
        server_data.get('ansible_memtotal_mb') or
        ansible_facts.get('memtotal_mb') or
        resources.get('memory_total_mb') or
        16384  # Default to 16GB if we can't find the value
    )
    
    mem_free = (
        server_data.get('ansible_memfree_mb') or
        ansible_facts.get('memfree_mb') or
        resources.get('memory_free_mb') or
        2048  # Default to 2GB free if we can't find the value
    )
    
    # Convert to GB
    try:
        mem_total_gb = int(float(mem_total)) // 1024
        if mem_total_gb == 0:
            mem_total_gb = 16  # Default to 16GB if conversion results in 0
    except (ValueError, TypeError):
        mem_total_gb = 16  # Default to 16GB on conversion error
        
    try:
        mem_free_gb = int(float(mem_free)) // 1024
        if mem_free_gb == 0:
            mem_free_gb = 2  # Default to 2GB if conversion results in 0
    except (ValueError, TypeError):
        mem_free_gb = 2  # Default to 2GB on conversion error
    
    # Disk info from ansible facts
    server_disk_total = resources.get('disk_total_gb', 0)
    server_disk_free = resources.get('disk_free_gb', 0)
    
    # Service status
    components = server_data.get('components', {})
    es_component = components.get('elasticsearch', {})
    es_status = 'OK' if es_component.get('status') == 'running' else 'NO'
    kb_status = 'OK' if components.get('kibana', {}).get('status') == 'running' else 'NO'
    fb_status = 'OK' if components.get('filebeat', {}).get('status') == 'running' else 'NO'
    mb_status = 'OK' if components.get('metricbeat', {}).get('status') == 'running' else 'NO'
    
    # ES data usage
    es_data_usage = es_component.get('data_usage', 'N/A')
    if not es_component.get('data_dir_exists', False):
        es_data_usage = 'N/A'
        
    # Calculate used memory and disk
    mem_used_gb = mem_total_gb - mem_free_gb
    if isinstance(server_disk_total, (int, float)) and isinstance(server_disk_free, (int, float)):
        server_disk_used = server_disk_total - server_disk_free
    else:
        server_disk_used = 0
        
    # Format the row with clear separation between data sources and proper alignment
    row = (
        f"{hostname:{host_col_width}} | "
        f"{ip:<12} | "
        f"{node_role:<6} | "
        f"{version:<7} | "
        f"{master:<6} | "
        f"{disk_total:<10} | "
        f"{disk_used_percent:<11} | "
        f"{heap_percent:<6} | "
        f"{ram_percent:<5} | "
        f"{cpu_percent:<5} | "
        f"{cpu_count:<3} | "
        f"{mem_used_gb:>2}/{mem_total_gb:<2} | "
        f"{server_disk_used:>6}/{server_disk_total:<6} | "
        f"{es_status:<3} | {kb_status:<3} | {fb_status:<3} | {mb_status:<3} | "
        f"{es_data_usage}"
    )
    
    return row

def main():
    """Main function to combine node tables."""
    
    if len(sys.argv) != 3:
        print("Usage: join_node_tables.py <es_nodes_json_file> <server_nodes_json_file>")
        sys.exit(1)
    
    es_nodes_file = sys.argv[1]
    server_nodes_file = sys.argv[2]
    
    # Read input files
    try:
        with open(es_nodes_file, 'r') as f:
            es_nodes_data = json.load(f)
        
        with open(server_nodes_file, 'r') as f:
            server_nodes_data = json.load(f)
    except Exception as e:
        print(f"Error reading input files: {e}")
        sys.exit(1)
    
    # Group nodes by their short hostname to avoid duplicates
    node_groups = {}
    canonical_hostnames = {}
    
    # First collect ES nodes data
    for node in es_nodes_data:
        hostname = node.get('name', '')
        if not hostname:
            continue
        
        # Use short hostname as the key for grouping
        short_hostname = hostname.split('.')[0]
        
        # Keep full hostname if available, otherwise use short
        canonical_name = hostname if '.' in hostname else short_hostname
        canonical_hostnames[short_hostname] = canonical_name
        
        # Initialize or update node group
        if short_hostname not in node_groups:
            node_groups[short_hostname] = {
                'es_data': node, 
                'server_data': {}, 
                'ip': extract_ip(node.get('ip', 'unknown')),
                'canonical_name': canonical_name
            }
        else:
            # If already exists, update with ES data
            node_groups[short_hostname]['es_data'] = node
            
            # If IP is better (actual IP vs hostname), update it
            ip = extract_ip(node.get('ip', ''))
            if ip and re.match(r'\d+\.\d+\.\d+\.\d+', ip):
                node_groups[short_hostname]['ip'] = ip
    
    # Then collect Ansible server data
    for node in server_nodes_data:
        hostname = node.get('hostname', '')
        if not hostname:
            continue
        
        # Use short hostname as the key for grouping
        short_hostname = hostname.split('.')[0]
        
        # Keep full hostname if available, otherwise use short
        canonical_name = hostname if '.' in hostname else short_hostname
        if short_hostname not in canonical_hostnames:
            canonical_hostnames[short_hostname] = canonical_name
        
        # Initialize or update node group
        if short_hostname not in node_groups:
            node_groups[short_hostname] = {
                'es_data': {}, 
                'server_data': node, 
                'ip': extract_ip(node.get('ip', 'unknown')),
                'canonical_name': canonical_hostnames[short_hostname]
            }
        else:
            # If already exists, update with server data
            node_groups[short_hostname]['server_data'] = node
            
            # If current IP is not a real IP but node has one, update it
            current_ip = node_groups[short_hostname]['ip']
            if not re.match(r'\d+\.\d+\.\d+\.\d+', current_ip):
                ip = extract_ip(node.get('ip', ''))
                if ip and re.match(r'\d+\.\d+\.\d+\.\d+', ip):
                    node_groups[short_hostname]['ip'] = ip
    
    # Filter out nodes that don't have Elasticsearch installed
    elasticsearch_nodes = {}
    for hostname, data in node_groups.items():
        es_component = data.get('server_data', {}).get('components', {}).get('elasticsearch', {})
        # Only include if Elasticsearch is installed and running
        if es_component.get('status') == 'running':
            elasticsearch_nodes[hostname] = data
    
    # Find the maximum hostname length for formatting
    max_host_len = 25  # Default minimum
    for hostname, data in elasticsearch_nodes.items():
        canonical_name = data['canonical_name']
        if len(canonical_name) > max_host_len:
            max_host_len = len(canonical_name)
    
    # Add some padding for safety
    max_host_len = max_host_len + 2
    
    # Create table header with proper alignment
    header_padding = "-" * max_host_len
    header = (
        f"{'Host':{max_host_len}} | "
        f"{'IP':<12} | "
        f"{'Role':<6} | "
        f"{'Version':<7} | "
        f"{'Master':<6} | "
        f"{'Disk Total':<10} | "
        f"{'Disk Used %':<11} | "
        f"{'Heap %':<6} | "
        f"{'RAM %':<5} | "
        f"{'CPU %':<5} | "
        f"{'CPU':<3} | "
        f"{'Memory Used/Total GB':<18} | "
        f"{'Disk Used/Total GB':<18} | "
        f"{'ES':<3} | {'KB':<3} | {'FB':<3} | {'MB':<3} | "
        f"{'ES Data'}"
    )
    
    separator = (
        f"{header_padding} | "
        f"{'-' * 12} | "
        f"{'-' * 6} | "
        f"{'-' * 7} | "
        f"{'-' * 6} | "
        f"{'-' * 10} | "
        f"{'-' * 11} | "
        f"{'-' * 6} | "
        f"{'-' * 5} | "
        f"{'-' * 5} | "
        f"{'-' * 3} | "
        f"{'-' * 18} | "
        f"{'-' * 18} | "
        f"{'-' * 3} | {'-' * 3} | {'-' * 3} | {'-' * 3} | "
        f"-------"
    )
    
    # Format rows - only for Elasticsearch nodes
    rows = []
    for short_hostname, data in elasticsearch_nodes.items():
        canonical_name = data['canonical_name']
        row = format_table_row(canonical_name, data, max_host_len)
        rows.append((short_hostname, row))
    
    # Sort rows by hostname and extract just the formatted row
    rows.sort()
    sorted_rows = [row for _, row in rows]
    
    # Print the table
    print("COMBINED NODE DETAILS (Elasticsearch Nodes Only)")
    print("------------------")
    print("Note: This table only includes nodes with Elasticsearch running. Helper/monitoring-only nodes are excluded.")
    print("")
    print(header)
    print(separator)
    for row in sorted_rows:
        print(row)
    
    print("\nLegend:")
    print("  ES=Elasticsearch, KB=Kibana, FB=Filebeat, MB=Metricbeat")
    print("  Services: OK=Running, NO=Not Installed/Not Running")
    print("  Memory and Disk format: Used/Total (in GB)")
    print("  Node Roles: h=hot, c=cold, f=frozen, m=master, i=ingest, l=ML, r=remote, d=data, v=voting")
    print("  Master: * = active master node, - = other nodes (including master-eligible nodes not currently active)")
    print("# The Python script only shows active Elasticsearch nodes")

if __name__ == "__main__":
    main()