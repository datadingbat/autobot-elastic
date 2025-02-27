#!/usr/bin/env python3
"""
check_hot_node.py - Simple script to test connectivity to an Elasticsearch hot node

Usage:
  python3 check_hot_node.py [hostname] [password]

Example:
  python3 check_hot_node.py hot1.elastic.internal mypassword
"""

import sys
import requests
import socket
import json
from urllib.parse import urlparse

def check_dns(hostname):
    """Check if we can resolve the hostname"""
    try:
        ip = socket.gethostbyname(hostname)
        print(f"✅ DNS resolution successful: {hostname} -> {ip}")
        return ip
    except socket.gaierror as e:
        print(f"❌ DNS resolution failed: {hostname} - {str(e)}")
        return None

def check_port(hostname, port=9200):
    """Check if we can connect to the port"""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)  # 5 second timeout
        result = sock.connect_ex((hostname, port))
        sock.close()
        
        if result == 0:
            print(f"✅ Port {port} on {hostname} is open")
            return True
        else:
            print(f"❌ Port {port} on {hostname} is closed - error code: {result}")
            return False
    except socket.error as e:
        print(f"❌ Socket error when connecting to {hostname}:{port} - {str(e)}")
        return False

def check_http(url, password=None):
    """Check if we can make an HTTP request"""
    try:
        headers = {'Content-Type': 'application/json'}
        auth = None
        
        if password:
            auth = ('elastic', password)
            
        # First try without auth
        if not password:
            print(f"Trying HTTP request to {url} without authentication...")
            response = requests.get(url, headers=headers, verify=False, timeout=10)
            print(f"  Status code: {response.status_code}")
            print(f"  Response: {response.text[:200]}...")
        
        # Then try with auth
        print(f"Trying HTTP request to {url} with authentication...")
        response = requests.get(
            url, 
            auth=auth,
            headers=headers,
            verify=False,  # Ignore SSL verification
            timeout=10
        )
        
        print(f"  Status code: {response.status_code}")
        if response.status_code == 200:
            print(f"✅ Successfully connected to {url}")
            try:
                json_response = response.json()
                print(f"  Response (JSON): {json.dumps(json_response, indent=2)}")
            except:
                print(f"  Response (text): {response.text[:200]}...")
            return True
        else:
            print(f"❌ Failed to connect to {url} - Status code: {response.status_code}")
            print(f"  Response: {response.text[:200]}...")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ HTTP request failed: {str(e)}")
        return False

def main():
    """Main function"""
    # Disable SSL warnings
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    
    if len(sys.argv) < 2:
        print("Usage: python3 check_hot_node.py [hostname] [password]")
        print("Example: python3 check_hot_node.py hot1.elastic.internal mypassword")
        sys.exit(1)
    
    hostname = sys.argv[1]
    password = None
    if len(sys.argv) >= 3:
        password = sys.argv[2]
    
    print(f"Testing connectivity to {hostname}...")
    
    # Check DNS
    ip = check_dns(hostname)
    if not ip:
        sys.exit(1)
    
    # Check port
    if not check_port(hostname):
        # Try with the IP directly
        print(f"Trying port check with IP {ip} directly...")
        if not check_port(ip):
            sys.exit(1)
    
    # Check HTTP
    health_url = f"https://{hostname}:9200/_cluster/health"
    check_http(health_url, password)
    
    # Check _cat/nodes endpoint
    nodes_url = f"https://{hostname}:9200/_cat/nodes?v&h=name,ip,node.role,version,master,disk.total,disk.used_percent,heap.percent,ram.percent,cpu&format=json"
    check_http(nodes_url, password)
    
    print("\nDiagnostic test completed.")

if __name__ == "__main__":
    main()