class NetworkDiagram {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.svg = null;
    this.width = 900;  // Increase from 800 to allow more space
    this.height = 600; // Increase from 500 to allow more vertical space
    this.initialized = false;
    
    // Store form field references
    this.formFields = {
      vpcCidr: document.getElementById('vpc_cidr'),
      publicSubnet1: document.getElementById('public_subnet1_cidr'),
      publicSubnet2: document.getElementById('public_subnet2_cidr'),
      privateSubnet: document.getElementById('private_subnet_cidr'),
      dnsZone: document.getElementById('dns_zone_name')
    };
    
    // Initialize colors to exactly match the new reference image (5.png)
    this.colors = {
      vpc: "#e9f0fa",  // Slightly lighter blue for VPC 
      vpcBorder: "#5b99ea",
      publicSubnet: "#e7f4fc",
      publicSubnetBorder: "#5b99ea", 
      privateSubnet: "#e5f9ee",
      privateSubnetBorder: "#5eba87",
      internet: "#f8f9fa",
      internetBorder: "#6c757d",
      connection: "#6c757d",
      node: "#ffffff",
      nodeBorder: "#6c757d",
      nodeText: "#333333"
    };
    
    // Create initial setup
    this.init();
  }
  
  init() {
    if (!this.container) {
      console.error("Container element not found");
      return;
    }
    
    // Clear any existing content
    this.container.innerHTML = '';
    
    // Create SVG element
    this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.svg.setAttribute("width", this.width);
    this.svg.setAttribute("height", this.height);
    this.svg.setAttribute("viewBox", `0 0 ${this.width} ${this.height}`);
    this.svg.setAttribute("class", "network-diagram");
    
    // Add SVG to container
    this.container.appendChild(this.svg);
    
    // Create initial elements
    this.createBaseElements();
    
    // Mark as initialized
    this.initialized = true;
    
    // Set up event listeners to track form changes
    this.setupEventListeners();
    
    // Do initial update
    this.update();
    
    // Add a delayed final update to ensure everything renders correctly
    setTimeout(() => {
      this.update();
    }, 200);
  }
  
  createBaseElements() {
    // Create defs section for markers
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    
    // Create arrow marker that precisely matches the 5.png reference image
    const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
    marker.setAttribute("id", "arrowhead");
    marker.setAttribute("markerWidth", "6");  // Smaller width to match reference exactly
    marker.setAttribute("markerHeight", "4");  // Smaller height to match reference exactly
    marker.setAttribute("refX", "6");  // Position at the tip
    marker.setAttribute("refY", "2");  // Center point
    marker.setAttribute("orient", "auto");  // Simple auto orientation
    
    const path = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    path.setAttribute("points", "0 0, 6 2, 0 4");  // Simpler triangle that matches reference exactly
    path.setAttribute("fill", "#6c757d");  // Exact color match to reference
    
    marker.appendChild(path);
    defs.appendChild(marker);
    this.svg.appendChild(defs);
    
    // Create group for main elements
    this.mainGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    this.svg.appendChild(this.mainGroup);
    
    // Create the base elements - these will be updated later
    this.elements = {
      internet: this.createRect(0, 0, 120, 50, 5, "Internet"),
      vpc: this.createRect(0, 0, 600, 350, 10, "VPC"),
      vpcCidrText: this.createText(0, 0, "", "vpc-cidr-text"),
      publicSubnet1: this.createRect(0, 0, 240, 150, 5, "Public Subnet 1"),
      publicSubnet1CidrText: this.createText(0, 0, "", "public-subnet1-cidr-text"),
      publicSubnet2: this.createRect(0, 0, 240, 150, 5, "Public Subnet 2"),
      publicSubnet2CidrText: this.createText(0, 0, "", "public-subnet2-cidr-text"),
      privateSubnet: this.createRect(0, 0, 240, 150, 5, "Private Subnet"),
      privateSubnetCidrText: this.createText(0, 0, "", "private-subnet-cidr-text"),
      internetGateway: this.createRect(0, 0, 140, 40, 5, "Internet Gateway"),
      natGateway: this.createRect(0, 0, 120, 40, 5, "NAT Gateway"),
      helperNode: this.createRect(0, 0, 100, 60, 5, "Console Node"),
      helperNodeText: this.createText(0, 0, "Management", "helper-node-text"),
      masterNodes: this.createRect(0, 0, 100, 60, 5, "Master Nodes"),
      masterNodesText: this.createText(0, 0, "Coordination", "master-nodes-text"),
      hotNodes: this.createRect(0, 0, 100, 60, 5, "Hot Nodes"),
      hotNodesText: this.createText(0, 0, "Active Data", "hot-nodes-text"),
    };
    
    // Create connection lines - these will be positioned later
    this.connections = {
      internetToIgw: this.createLine(0, 0, 0, 0, "internet-to-igw"),
      igwToVpc: this.createLine(0, 0, 0, 0, "igw-to-vpc"),
      igwToPublic1: this.createLine(0, 0, 0, 0, "igw-to-public1"),
      igwToPublic2: this.createLine(0, 0, 0, 0, "igw-to-public2"),
      public1ToNat: this.createLine(0, 0, 0, 0, "public1-to-nat"),
      natToPrivate: this.createLine(0, 0, 0, 0, "nat-to-private"),
      public1ToHelper: this.createLine(0, 0, 0, 0, "public1-to-helper"),
      helperToMaster: this.createLine(0, 0, 0, 0, "helper-to-master"),
      masterToHot: this.createLine(0, 0, 0, 0, "master-to-hot")
    };
    
    // Add a legend
    this.createLegend();
  }
  
  createRect(x, y, width, height, radius, label) {
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.setAttribute("class", `diagram-node ${label.toLowerCase().replace(/\s+/g, '-')}`);
    
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", x);
    rect.setAttribute("y", y);
    rect.setAttribute("width", width);
    rect.setAttribute("height", height);
    rect.setAttribute("rx", radius);
    
    // Set color based on node type
    if (label.includes("VPC")) {
      rect.setAttribute("fill", this.colors.vpc);
      rect.setAttribute("stroke", this.colors.vpcBorder);
    } else if (label.includes("Public")) {
      rect.setAttribute("fill", this.colors.publicSubnet);
      rect.setAttribute("stroke", this.colors.publicSubnetBorder);
    } else if (label.includes("Private")) {
      rect.setAttribute("fill", this.colors.privateSubnet);
      rect.setAttribute("stroke", this.colors.privateSubnetBorder);
    } else if (label.includes("Internet")) {
      rect.setAttribute("fill", this.colors.internet);
      rect.setAttribute("stroke", this.colors.internetBorder);
    } else {
      rect.setAttribute("fill", this.colors.node);
      rect.setAttribute("stroke", this.colors.nodeBorder);
    }
    
    rect.setAttribute("stroke-width", "2");
    
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", x + width / 2);
    text.setAttribute("y", y + 16);  // Move up from 20 to 16
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("fill", this.colors.nodeText);
    text.setAttribute("font-size", "12px");
    text.setAttribute("font-weight", "bold");
    text.textContent = label;
    
    group.appendChild(rect);
    group.appendChild(text);
    this.mainGroup.appendChild(group);
    
    return group;
  }
  
  createText(x, y, content, className) {
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", x);
    text.setAttribute("y", y);
    text.setAttribute("class", className);
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("fill", "#333333"); // Darker text for better visibility
    text.setAttribute("font-size", "11px"); // Slightly larger
    text.setAttribute("font-weight", "normal");
    text.textContent = content;
    
    this.mainGroup.appendChild(text);
    return text;
  }
  
  createLine(x1, y1, x2, y2, className) {
    // Use path instead of line for better arrow positioning
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    // Create a slightly curved path for better visual appearance
    const dx = x2 - x1;
    const dy = y2 - y1;
    const curve = Math.min(Math.abs(dx), Math.abs(dy)) * 0.2; // Small curve factor
    
    let pathData;
    if (Math.abs(dx) > Math.abs(dy)) {
      // More horizontal - gentle horizontal curve
      pathData = `M${x1},${y1} C${x1 + dx/3},${y1} ${x2 - dx/3},${y2} ${x2},${y2}`;
    } else {
      // More vertical - gentle vertical curve
      pathData = `M${x1},${y1} C${x1},${y1 + dy/3} ${x2},${y2 - dy/3} ${x2},${y2}`;
    }
    
    path.setAttribute("d", pathData);
    path.setAttribute("class", className);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "#6c757d");  // Exact match to reference
    path.setAttribute("stroke-width", "1");  // Thinner line like reference
    path.setAttribute("marker-end", "url(#arrowhead)");
    
    this.mainGroup.appendChild(path);
    return path;
  }
  
  createLegend() {
    const legend = document.createElementNS("http://www.w3.org/2000/svg", "g");
    legend.setAttribute("class", "diagram-legend");
    legend.setAttribute("transform", `translate(20, ${this.height - 80})`);
    
    const legendData = [
      { color: this.colors.vpc, border: this.colors.vpcBorder, text: "VPC" },
      { color: this.colors.publicSubnet, border: this.colors.publicSubnetBorder, text: "Public Subnet" },
      { color: this.colors.privateSubnet, border: this.colors.privateSubnetBorder, text: "Private Subnet" },
      { color: this.colors.node, border: this.colors.nodeBorder, text: "Node" }
    ];
    
    legendData.forEach((item, index) => {
      const x = index * 150;
      
      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("x", x);
      rect.setAttribute("y", 0);
      rect.setAttribute("width", 15);
      rect.setAttribute("height", 15);
      rect.setAttribute("fill", item.color);
      rect.setAttribute("stroke", item.border);
      rect.setAttribute("stroke-width", "1");
      
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", x + 20);
      text.setAttribute("y", 12);
      text.setAttribute("fill", "#333333");
      text.setAttribute("font-size", "10px");
      text.textContent = item.text;
      
      legend.appendChild(rect);
      legend.appendChild(text);
    });
    
    // Add a connection line sample to the legend
    const lineX = legendData.length * 150;
    
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", lineX);
    line.setAttribute("y1", 7);
    line.setAttribute("x2", lineX + 30);
    line.setAttribute("y2", 7);
    line.setAttribute("stroke", this.colors.connection);
    line.setAttribute("stroke-width", "1.5");
    line.setAttribute("marker-end", "url(#arrowhead)");
    
    const lineText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    lineText.setAttribute("x", lineX + 40);
    lineText.setAttribute("y", 12);
    lineText.setAttribute("fill", "#333333");
    lineText.setAttribute("font-size", "10px");
    lineText.textContent = "Connection";
    
    legend.appendChild(line);
    legend.appendChild(lineText);
    
    this.svg.appendChild(legend);
  }
  
  setupEventListeners() {
    // Add change listeners to all form fields that affect the diagram
    Object.values(this.formFields).forEach(field => {
      if (field) {
        field.addEventListener('change', () => this.update());
        field.addEventListener('input', () => this.update());
      }
    });
    
    // Listen for node count changes
    const hotNodeCount = document.getElementById('hot_node_count');
    if (hotNodeCount) {
      hotNodeCount.addEventListener('change', () => this.update());
      hotNodeCount.addEventListener('input', () => this.update());
    }
    
    // Listen for instance type changes
    const instanceTypeMaster = document.getElementById('instance_type_master');
    const instanceTypeHot = document.getElementById('instance_type_hot');
    
    if (instanceTypeMaster) instanceTypeMaster.addEventListener('change', () => this.update());
    if (instanceTypeHot) instanceTypeHot.addEventListener('change', () => this.update());
  }
  
  update() {
    // Get current values from form fields
    const vpcCidr = this.formFields.vpcCidr ? this.formFields.vpcCidr.value : "10.0.0.0/16";
    const publicSubnet1 = this.formFields.publicSubnet1 ? this.formFields.publicSubnet1.value : "10.0.1.0/24";
    const publicSubnet2 = this.formFields.publicSubnet2 ? this.formFields.publicSubnet2.value : "10.0.2.0/24";
    const privateSubnet = this.formFields.privateSubnet ? this.formFields.privateSubnet.value : "10.0.3.0/24";
    
    // Calculate positions with increased space for bigger components
    const margin = 60;  // Increase margin for more space around edges
    const vpcX = margin + 30; 
    const vpcY = 120;   // Move down more to give space for Internet and IGW
    const vpcWidth = this.width - 2 * margin - 60; // Make VPC wider
    const vpcHeight = 350;  // Make VPC taller for more vertical room
    
    // Position VPC
    this.positionElement(this.elements.vpc, vpcX, vpcY, vpcWidth, vpcHeight);
    
    // Separate the VPC title from the CIDR label by adjusting the title position
    const vpcTitle = this.elements.vpc.querySelector('text');
    if (vpcTitle) {
      vpcTitle.setAttribute("y", vpcY + 16); // Move the VPC title higher
    }
    
    // Position CIDR label below the title
    this.positionText(this.elements.vpcCidrText, vpcX + vpcWidth / 2, vpcY + 35, `CIDR: ${vpcCidr}`);
    
    // Position Internet above VPC
    const internetX = vpcX + vpcWidth / 2 - 50;
    const internetY = 40;
    this.positionElement(this.elements.internet, internetX, internetY, 100, 35); // Make larger for better visibility
    
    // Position Internet Gateway between Internet and VPC
    const igwX = vpcX + vpcWidth / 2 - 60;
    const igwY = internetY + 50;
    this.positionElement(this.elements.internetGateway, igwX, igwY, 120, 35); // Make larger for better visibility
    
    // Position subnets inside VPC with more spacious layout
    const subnetMargin = 35;  // Increase margin between subnets
    const subnetWidth = (vpcWidth - 4 * subnetMargin) / 3; // Width based on VPC size
    const subnetHeight = 180;  // Make subnets taller for better component placement
    
    // Public Subnet 1 (left)
    const publicSubnet1X = vpcX + subnetMargin;
    const publicSubnet1Y = vpcY + 50; // Move down slightly for better spacing
    this.positionElement(this.elements.publicSubnet1, publicSubnet1X, publicSubnet1Y, subnetWidth, subnetHeight);
    this.positionText(
      this.elements.publicSubnet1CidrText, 
      publicSubnet1X + subnetWidth / 2, 
      publicSubnet1Y + 35, // Increase for better spacing
      `CIDR: ${publicSubnet1}`
    );
    
    // Separate the subtitle from the CIDR label by adjusting the title position
    const publicSubnet1Title = this.elements.publicSubnet1.querySelector('text');
    if (publicSubnet1Title) {
      publicSubnet1Title.setAttribute("y", publicSubnet1Y + 16); // Move the title higher
    }
    
    // Public Subnet 2 (middle)
    const publicSubnet2X = publicSubnet1X + subnetWidth + subnetMargin;
    const publicSubnet2Y = publicSubnet1Y;
    this.positionElement(this.elements.publicSubnet2, publicSubnet2X, publicSubnet2Y, subnetWidth, subnetHeight);
    this.positionText(
      this.elements.publicSubnet2CidrText, 
      publicSubnet2X + subnetWidth / 2, 
      publicSubnet2Y + 35, // Match spacing with subnet 1
      `CIDR: ${publicSubnet2}`
    );
    
    // Separate the subtitle from the CIDR label by adjusting the title position
    const publicSubnet2Title = this.elements.publicSubnet2.querySelector('text');
    if (publicSubnet2Title) {
      publicSubnet2Title.setAttribute("y", publicSubnet2Y + 16); // Move the title higher
    }
    
    // Private Subnet (right)
    const privateSubnetX = publicSubnet2X + subnetWidth + subnetMargin;
    const privateSubnetY = publicSubnet1Y;
    this.positionElement(this.elements.privateSubnet, privateSubnetX, privateSubnetY, subnetWidth, subnetHeight);
    this.positionText(
      this.elements.privateSubnetCidrText, 
      privateSubnetX + subnetWidth / 2, 
      privateSubnetY + 35, // Match spacing with other subnets
      `CIDR: ${privateSubnet}`
    );
    
    // Separate the subtitle from the CIDR label by adjusting the title position
    const privateSubnetTitle = this.elements.privateSubnet.querySelector('text');
    if (privateSubnetTitle) {
      privateSubnetTitle.setAttribute("y", privateSubnetY + 16); // Move the title higher
    }
    
    // Position NAT Gateway in Public Subnet 1 with more room
    const natX = publicSubnet1X + 30;
    const natY = publicSubnet1Y + 70;
    this.positionElement(this.elements.natGateway, natX, natY, 100, 35); // Make larger for better visibility
    
    // Position Helper Node below NAT Gateway in Public Subnet 1 with better spacing
    const helperX = publicSubnet1X + 30; // Align with NAT Gateway
    const helperY = natY + 60; // More space between NAT and Helper
    this.positionElement(this.elements.helperNode, helperX, helperY, 100, 45); // Make larger for better visibility
    this.positionText(this.elements.helperNodeText, helperX + 50, helperY + 26, "Management");
    
    // Ensure helper node title is positioned correctly
    const helperNodeTitle = this.elements.helperNode.querySelector('text');
    if (helperNodeTitle) {
      helperNodeTitle.setAttribute("y", helperY + 16); // Consistent positioning
    }
    
    // Position Master Nodes in Private Subnet with better positioning
    const masterX = privateSubnetX + 30;
    const masterY = privateSubnetY + 70;
    this.positionElement(this.elements.masterNodes, masterX, masterY, 110, 45); // Make larger for better visibility
    this.positionText(this.elements.masterNodesText, masterX + 55, masterY + 26, "Coordination");
    
    // Ensure master node title is positioned correctly
    const masterNodeTitle = this.elements.masterNodes.querySelector('text');
    if (masterNodeTitle) {
      masterNodeTitle.setAttribute("y", masterY + 16); // Consistent positioning
    }
    
    // Position Hot Nodes in Private Subnet below Master Nodes with more space
    const hotX = privateSubnetX + 30; // Align with Master Nodes
    const hotY = masterY + 70; // More space between Master and Hot Nodes
    this.positionElement(this.elements.hotNodes, hotX, hotY, 110, 45); // Match size with Master Nodes
    this.positionText(this.elements.hotNodesText, hotX + 55, hotY + 26, "Active Data");
    
    // Ensure hot node title is positioned correctly
    const hotNodeTitle = this.elements.hotNodes.querySelector('text');
    if (hotNodeTitle) {
      hotNodeTitle.setAttribute("y", hotY + 16); // Consistent positioning
    }
    
    // Update connection lines to exactly match reference image
    // Internet to IGW - adjust for new component sizes
    this.positionLine(
      this.connections.internetToIgw,
      internetX + 50, internetY + 35,
      igwX + 60, igwY
    );
    
    // IGW to VPC - use straight line instead of curve
    this.positionLine(
      this.connections.igwToVpc,
      igwX + 60, igwY + 35,
      igwX + 60, vpcY
    );
    
    // Show IGW to Public Subnet connections
    if (this.connections.igwToPublic1) {
      this.connections.igwToPublic1.style.display = 'block'; // Change from 'none'
    }
    
    if (this.connections.igwToPublic2) {
      this.connections.igwToPublic2.style.display = 'block'; // Change from 'none'
    }
    
    // NAT to Private Subnet - improved connection positioning to avoid crossing lines
    this.positionLine(
      this.connections.natToPrivate,
      natX + 100, natY + 17,  // Starting from right side of NAT Gateway
      privateSubnetX, privateSubnetY + 85  // Arriving at left side of Private Subnet at a better height
    );
    
    // Show the connection from public subnet to NAT
    if (this.connections.public1ToNat) {
      this.connections.public1ToNat.style.display = 'block'; // Change from 'none'
    }
    
    // Helper Node to NAT connection not visible in reference
    if (this.connections.public1ToHelper) {
      this.connections.public1ToHelper.style.display = 'block'; // Change from 'none'
    }
    
    // Helper to Master - adjust for new component positions to avoid crossing lines
    this.positionLine(
      this.connections.helperToMaster,
      helperX + 100, helperY + 22,
      masterX, masterY + 22
    );
    
    // Master to Hot - vertical connection with better positioning
    this.positionLine(
      this.connections.masterToHot,
      masterX + 55, masterY + 45,
      hotX + 55, hotY
    );
    
    // Do not execute recursive update inside the update method as it will cause an infinite loop
    // The delayed update should be in the init() method instead
  }
  
  positionElement(element, x, y, width, height) {
    if (!element) return;
    
    // Get the rectangle (first child)
    const rect = element.querySelector('rect');
    if (rect) {
      rect.setAttribute("x", x);
      rect.setAttribute("y", y);
      rect.setAttribute("width", width);
      rect.setAttribute("height", height);
    }
    
    // Get the label (second child)
    const text = element.querySelector('text');
    if (text) {
      text.setAttribute("x", x + width / 2);
      text.setAttribute("y", y + 16);  // Position consistently at 16px from top 
      text.setAttribute("font-weight", "bold");
    }
  }
  
  positionText(textElement, x, y, content) {
    if (!textElement) return;
    
    textElement.setAttribute("x", x);
    textElement.setAttribute("y", y);
    textElement.textContent = content;
  }
  
  positionLine(line, x1, y1, x2, y2) {
    if (!line) return;
    
    // Handle path elements
    if (line.tagName === 'path') {
      const dx = x2 - x1;
      const dy = y2 - y1;
      
      // Use straighter lines with minimal curvature
      const curveFactor = 0.05;  // Very subtle curve
      
      let pathData;
      // Different curve calculations based on direction
      if (Math.abs(dx) > Math.abs(dy)) {
        // More horizontal - very subtle curve
        pathData = `M${x1},${y1} C${x1 + dx*curveFactor},${y1} ${x2 - dx*curveFactor},${y2} ${x2},${y2}`;
      } else {
        // More vertical - very subtle curve
        pathData = `M${x1},${y1} C${x1},${y1 + dy*curveFactor} ${x2},${y2 - dy*curveFactor} ${x2},${y2}`;
      }
      
      line.setAttribute("d", pathData);
    } else {
      // Fallback for any remaining line elements
      line.setAttribute("x1", x1);
      line.setAttribute("y1", y1);
      line.setAttribute("x2", x2);
      line.setAttribute("y2", y2);
    }
  }
}

// NodeDiagram class for visualizing the Elasticsearch node architecture
class NodeDiagram {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.svg = null;
    this.width = Math.max(1000, this.container ? this.container.clientWidth : 1000);
    this.height = Math.max(700, this.container ? this.container.clientHeight : 700);
    this.initialized = false;
    this.showMonitoringOverlay = false;
    this.fullscreen = false;
    this.dataFlowsInitialized = false;
    
    // Add viewport control variables
    this.viewportTransform = {
      scale: 1,
      translateX: 0,
      translateY: 0
    };
    
    // Add flag to track if dragging is in progress
    this.isDragging = false;
    this.dragStart = { x: 0, y: 0 };
    
    // Original diagram dimensions
    this.originalDimensions = {
      width: 0,
      height: 0
    };
    
    // Store form field references
    this.formFields = {
      masterInstanceType: document.getElementById('instance_type_master'),
      hotNodeCount: document.getElementById('hot_node_count'),
      hotInstanceType: document.getElementById('instance_type_hot'),
      mlNodeCount: document.getElementById('ml_node_count'),
      mlInstanceType: document.getElementById('instance_type_ml'),
      frozenNodeCount: document.getElementById('frozen_node_count'),
      frozenInstanceType: document.getElementById('instance_type_frozen')
    };
    
    // Initialize colors with improved palette
    this.colors = {
      master: "#2962ff",  // More vibrant blue
      hot: "#e53935",     // Slightly deeper red
      ml: "#00acc1",      // Brighter teal
      frozen: "#43a047",  // Richer green
      helper: "#6200ea",  // Deeper purple
      other: "#5f6368",   // Neutral gray
      text: "#ffffff",
      connection: "#9e9e9e",
      monitoringConnection: "#ff6d00",
      dataConnection: "#2979ff",
      ingestionFlow: "#2979ff", // Blue for data ingestion
      searchFlow: "#00c853",    // Green for search queries
      archivingFlow: "#ff6d00", // Orange for data archiving
      background: "#f8f9fa",
      box: "rgba(255, 255, 255, 0.9)",
      boxBorder: "#e0e0e0"
    };
    
    // Create initial setup
    this.init();
  }
  
  init() {
    if (!this.container) {
      console.error("Container element not found");
      return;
    }
    
    // Clear any existing content
    this.container.innerHTML = '';
    
    // Get accurate container dimensions
    this.width = this.container.clientWidth || this.width;
    this.height = this.container.clientHeight || this.height;
    
    // Create SVG element
    this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.svg.setAttribute("width", "100%");
    this.svg.setAttribute("height", "100%");
    this.svg.setAttribute("class", "node-diagram");
    
    // Add SVG to container
    this.container.appendChild(this.svg);
    
    // Create a background rectangle
    const background = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    background.setAttribute("width", this.width);
    background.setAttribute("height", this.height);
    background.setAttribute("fill", this.colors.background);
    background.setAttribute("rx", "5");
    this.svg.appendChild(background);
    
    // Create a root group that will be transformed for pan/zoom
    this.rootGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    this.rootGroup.setAttribute("id", "root-transform-group");
    this.svg.appendChild(this.rootGroup);
    
    // Create tooltip element
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'node-tooltip';
    this.tooltip.style.display = 'none';
    this.tooltip.style.position = 'absolute';
    this.tooltip.style.zIndex = '1000';
    document.body.appendChild(this.tooltip);
    
    // Create initial elements
    this.createBaseElements();
    
    // Mark as initialized
    this.initialized = true;
    
    // Set up event listeners to track form changes
    this.setupEventListeners();
    
    // Do initial update
    this.update();
    
    // Handle initial centering
    this.initCentering();
  }
  
  // Special initialization for centering content
  initCentering() {
    // We need to ensure correct rendering before attempting to measure and center
    // First set a safe initial transform to ensure minimal content visibility
    this.viewportTransform = {
      scale: 0.5,
      translateX: this.width / 2,
      translateY: this.height / 2
    };
    this.updateViewportTransform();
    
    // For the initial diagram, we need a more aggressive approach to centering
    const attemptCentering = () => {
      // Use special hardcoded offsets that work reliably for this specific diagram
      const defaultScale = 0.45;  // Known working scale for this diagram
      const defaultX = 250;       // Known working X offset for this diagram
      const defaultY = 230;       // Known working Y offset for this diagram
      
      // Apply these known good values for initial rendering
      this.viewportTransform = {
        scale: defaultScale,
        translateX: defaultX, 
        translateY: defaultY
      };
      this.updateViewportTransform();
      
      // Add zoom controls and drag indicator
      this.addZoomControls();
      this.addDragIndicator();
      
      // After initial render with hardcoded values, try to optimize
      window.requestAnimationFrame(() => {
        // Now try to measure and fine-tune (but keep hardcoded values as backup)
        try {
          const bbox = this.mainGroup.getBBox();
          if (bbox && bbox.width > 0 && bbox.height > 0) {
            this.optimizeLayoutForContainer();
          }
        } catch (e) {
          // If optimization fails, we still have working hardcoded values
          console.log("Using default positioning values");
        }
      });
    };
    
    // Attempt centering after a short delay to allow rendering
    setTimeout(attemptCentering, 50);
  }
  
  // Helper method to properly center and scale all content
  optimizeLayoutForContainer() {
    // Get accurate bounding box of all content
    const bbox = this.mainGroup.getBBox();
    
    // Calculate optimal scale to fit all content within container
    const padding = 60;
    const scaleX = this.width / (bbox.width + padding * 2);
    const scaleY = this.height / (bbox.height + padding * 2);
    const scale = Math.min(scaleX, scaleY, 0.9); // Cap at 0.9 to prevent blurriness
    
    // Calculate center point to position diagram in the middle of container
    const centerX = (this.width / scale - bbox.width) / 2 - bbox.x;
    const centerY = (this.height / scale - bbox.height) / 2 - bbox.y;
    
    // Apply the transform
    this.viewportTransform = {
      scale: scale,
      translateX: centerX,
      translateY: centerY
    };
    
    this.updateViewportTransform();
  }
  
  createBaseElements() {
    // Create defs section for markers
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    
    // Create arrow marker for normal connections
    const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
    marker.setAttribute("id", "cluster-arrow");
    marker.setAttribute("markerWidth", "10");
    marker.setAttribute("markerHeight", "7");
    marker.setAttribute("refX", "9");
    marker.setAttribute("refY", "3.5");
    marker.setAttribute("orient", "auto");
    
    const path = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    path.setAttribute("points", "0 0, 10 3.5, 0 7");
    path.setAttribute("fill", this.colors.connection);
    
    marker.appendChild(path);
    defs.appendChild(marker);
    
    // Create arrow marker for monitoring connections
    const monitoringMarker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
    monitoringMarker.setAttribute("id", "monitoring-arrow");
    monitoringMarker.setAttribute("markerWidth", "10");
    monitoringMarker.setAttribute("markerHeight", "7");
    monitoringMarker.setAttribute("refX", "9");
    monitoringMarker.setAttribute("refY", "3.5");
    monitoringMarker.setAttribute("orient", "auto");
    
    const monitoringPath = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    monitoringPath.setAttribute("points", "0 0, 10 3.5, 0 7");
    monitoringPath.setAttribute("fill", this.colors.monitoringConnection);
    
    monitoringMarker.appendChild(monitoringPath);
    defs.appendChild(monitoringMarker);
    
    // Create arrow marker for data connections
    const dataMarker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
    dataMarker.setAttribute("id", "data-arrow");
    dataMarker.setAttribute("markerWidth", "10");
    dataMarker.setAttribute("markerHeight", "7");
    dataMarker.setAttribute("refX", "9");
    dataMarker.setAttribute("refY", "3.5");
    dataMarker.setAttribute("orient", "auto");
    
    const dataPath = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    dataPath.setAttribute("points", "0 0, 10 3.5, 0 7");
    dataPath.setAttribute("fill", this.colors.dataConnection);
    
    dataMarker.appendChild(dataPath);
    defs.appendChild(dataMarker);
    
    // Create arrow markers for data flow types
    const flowTypes = [
      { id: "ingestion", color: "#2979ff" },
      { id: "search", color: "#00c853" },
      { id: "archiving", color: "#ff6d00" }
    ];
    
    flowTypes.forEach(flow => {
      const flowMarker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
      flowMarker.setAttribute("id", `${flow.id}-arrow`);
      flowMarker.setAttribute("markerWidth", "10");
      flowMarker.setAttribute("markerHeight", "7");
      flowMarker.setAttribute("refX", "9");
      flowMarker.setAttribute("refY", "3.5");
      flowMarker.setAttribute("orient", "auto");
      
      const flowPath = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
      flowPath.setAttribute("points", "0 0, 10 3.5, 0 7");
      flowPath.setAttribute("fill", flow.color);
      
      flowMarker.appendChild(flowPath);
      defs.appendChild(flowMarker);
    });
    
    this.svg.appendChild(defs);
    
    // Move mainGroup into rootGroup instead of directly in svg
    this.mainGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    this.rootGroup.appendChild(this.mainGroup);
    
    // Create a group for node boxes, nodes and connections
    this.boxesGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    this.boxesGroup.setAttribute("class", "boxes-layer");
    this.boxesGroup.setAttribute("transform", "translate(0, 60)");
    this.mainGroup.appendChild(this.boxesGroup);
    
    this.nodesGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    this.nodesGroup.setAttribute("class", "nodes-layer");
    this.nodesGroup.setAttribute("transform", "translate(0, 60)");
    this.mainGroup.appendChild(this.nodesGroup);
    
    this.connectionsGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    this.connectionsGroup.setAttribute("class", "connections-layer");
    this.connectionsGroup.setAttribute("transform", "translate(0, 60)");
    this.mainGroup.appendChild(this.connectionsGroup);
    
    // Title should be outside the transformable area
    const title = document.createElementNS("http://www.w3.org/2000/svg", "text");
    title.setAttribute("x", this.width / 2);
    title.setAttribute("y", 30);
    title.setAttribute("text-anchor", "middle");
    title.setAttribute("font-size", "18px");
    title.setAttribute("font-weight", "bold");
    title.setAttribute("fill", "#333");
    title.textContent = "Elasticsearch Cluster Architecture";
    this.svg.appendChild(title);
    
    // Add monitoring toggle and fullscreen toggle outside the pan/zoom area
    this.createMonitoringToggle();
    this.addFullscreenToggle();
    
    // Add data flow controls
    this.createDataFlowControls();
    
    // Connection lines will be created dynamically
    this.connections = [];
    this.monitoringConnections = [];
    
    // Add a legend - outside the pan/zoom area
    this.createLegend();
  }
  
  updateViewportTransform() {
    const { scale, translateX, translateY } = this.viewportTransform;
    this.rootGroup.setAttribute(
      "transform", 
      `translate(${translateX}, ${translateY}) scale(${scale})`
    );
    
    // Add a class to indicate zoom level for styling purposes
    if (scale <= 0.5) {
      this.svg.classList.add("zoomed-out");
    } else {
      this.svg.classList.remove("zoomed-out");
    }
  }
  
  createMonitoringToggle() {
    const toggleGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    toggleGroup.setAttribute("class", "monitoring-toggle");
    toggleGroup.setAttribute("transform", `translate(${this.width - 180}, 10)`);
    
    // Toggle background
    const toggleBg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    toggleBg.setAttribute("x", 0);
    toggleBg.setAttribute("y", 0);
    toggleBg.setAttribute("width", 170);
    toggleBg.setAttribute("height", 26);
    toggleBg.setAttribute("rx", 13);
    toggleBg.setAttribute("fill", "#f8f9fa");
    toggleBg.setAttribute("stroke", "#dee2e6");
    toggleBg.setAttribute("stroke-width", "1");
    toggleGroup.appendChild(toggleBg);
    
    // Toggle text
    const toggleText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    toggleText.setAttribute("x", 10);
    toggleText.setAttribute("y", 17);
    toggleText.setAttribute("fill", "#333");
    toggleText.setAttribute("font-size", "12px");
    toggleText.textContent = "Show Monitoring Traffic";
    toggleGroup.appendChild(toggleText);
    
    // Toggle switch background
    const switchBg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    switchBg.setAttribute("x", 135);
    switchBg.setAttribute("y", 5);
    switchBg.setAttribute("width", 30);
    switchBg.setAttribute("height", 16);
    switchBg.setAttribute("rx", 8);
    switchBg.setAttribute("fill", "#e9ecef");
    switchBg.setAttribute("stroke", "#ced4da");
    switchBg.setAttribute("stroke-width", "1");
    toggleGroup.appendChild(switchBg);
    
    // Toggle switch handle
    const switchHandle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    switchHandle.setAttribute("cx", 142);
    switchHandle.setAttribute("cy", 13);
    switchHandle.setAttribute("r", 6);
    switchHandle.setAttribute("fill", "#ffffff");
    switchHandle.setAttribute("stroke", "#ced4da");
    switchHandle.setAttribute("stroke-width", "1");
    switchHandle.setAttribute("id", "monitoring-toggle-handle");
    toggleGroup.appendChild(switchHandle);
    
    // Make the entire group clickable
    toggleGroup.style.cursor = "pointer";
    toggleGroup.addEventListener("click", () => {
      this.showMonitoringOverlay = !this.showMonitoringOverlay;
      
      // Update switch appearance
      if (this.showMonitoringOverlay) {
        switchBg.setAttribute("fill", this.colors.monitoringConnection);
        switchBg.setAttribute("stroke", this.colors.monitoringConnection);
        switchHandle.setAttribute("cx", 158);
      } else {
        switchBg.setAttribute("fill", "#e9ecef");
        switchBg.setAttribute("stroke", "#ced4da");
        switchHandle.setAttribute("cx", 142);
      }
      
      // Update monitoring connections
      this.updateMonitoringConnections();
    });
    
    this.mainGroup.appendChild(toggleGroup);
  }
  
  createNodeBox(x, y, width, height, type) {
    const boxGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    boxGroup.setAttribute("class", `node-box ${type}-box`);
    
    // Create shadow for depth
    const shadowFilter = `drop-shadow(0 3px 5px rgba(0,0,0,0.15))`;
    
    // Create the box rectangle with rounded corners
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", x);
    rect.setAttribute("y", y);
    rect.setAttribute("width", width);
    rect.setAttribute("height", height);
    rect.setAttribute("rx", 12);
    rect.setAttribute("ry", 12);
    rect.setAttribute("fill", "white");
    rect.setAttribute("stroke", this.colors.boxBorder);
    rect.setAttribute("stroke-width", "1.5");
    rect.setAttribute("filter", shadowFilter);
    
    if (type === "helper") {
      rect.setAttribute("stroke-dasharray", "5,3");
    }
    
    // Choose banner color based on node type
    let bannerColor;
    switch (type) {
      case "master": bannerColor = this.colors.master; break;
      case "hot": bannerColor = this.colors.hot; break;
      case "ml": bannerColor = this.colors.ml; break;
      case "frozen": bannerColor = this.colors.frozen; break;
      case "helper": bannerColor = this.colors.helper; break;
      default: bannerColor = this.colors.other;
    }
    
    // Top banner with gradient effect
    const bannerHeight = 28; // Taller, more prominent banner
    const banner = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    banner.setAttribute("x", x);
    banner.setAttribute("y", y);
    banner.setAttribute("width", width);
    banner.setAttribute("height", bannerHeight);
    banner.setAttribute("rx", 12);
    banner.setAttribute("ry", 12);
    banner.setAttribute("fill", bannerColor);
    
    // Create a clip path for the banner to only round the top corners
    const clipId = `banner-clip-${type}-${Math.random().toString(36).substr(2, 9)}`;
    const clipPath = document.createElementNS("http://www.w3.org/2000/svg", "clipPath");
    clipPath.setAttribute("id", clipId);
    
    const clipRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    clipRect.setAttribute("x", x);
    clipRect.setAttribute("y", y);
    clipRect.setAttribute("width", width);
    clipRect.setAttribute("height", bannerHeight + 10);
    clipRect.setAttribute("rx", 12);
    clipRect.setAttribute("ry", 12);
    
    clipPath.appendChild(clipRect);
    
    // Ensure we have a defs section for the gradient
    let defs = this.svg.querySelector("defs");
    if (!defs) {
      defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
      this.svg.appendChild(defs);
    }
    
    defs.appendChild(clipPath);
    banner.setAttribute("clip-path", `url(#${clipId})`);
    
    // Add title label for the box
    const titleText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    titleText.setAttribute("x", x + width / 2);
    titleText.setAttribute("y", y + 18);
    titleText.setAttribute("text-anchor", "middle");
    titleText.setAttribute("font-size", "14px");
    titleText.setAttribute("font-weight", "600");
    titleText.setAttribute("fill", "#ffffff");
    titleText.setAttribute("font-family", "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif");
    
    // Set title based on type
    let title;
    switch (type) {
      case "master": title = "Master Nodes"; break;
      case "hot": title = "Hot Nodes"; break;
      case "ml": title = "ML Nodes"; break;
      case "frozen": title = "Frozen Nodes"; break;
      case "helper": title = "Console Node"; break;
      default: title = "Nodes";
    }
    titleText.textContent = title;
    
    // Add subtle inner shadow to box for depth
    const innerShadow = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    innerShadow.setAttribute("x", x);
    innerShadow.setAttribute("y", y + bannerHeight - 1);
    innerShadow.setAttribute("width", width);
    innerShadow.setAttribute("height", 5);
    innerShadow.setAttribute("fill", "rgba(0,0,0,0.06)");
    innerShadow.setAttribute("clip-path", `url(#${clipId})`);
    
    boxGroup.appendChild(rect);
    boxGroup.appendChild(banner);
    boxGroup.appendChild(innerShadow);
    boxGroup.appendChild(titleText);
    
    // Add role subtitle
    let roleText = "";
    switch (type) {
      case "helper": roleText = "Management, Kibana, Monitoring"; break;
      case "master": roleText = "Coordination & Cluster State"; break;
      case "hot": roleText = "Active & Recent Data"; break;
      case "ml": roleText = "Machine Learning & Analytics"; break;
      case "frozen": roleText = "Historical Data Archive"; break;
    }
    
    const roleLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
    roleLabel.setAttribute("x", x + width / 2);
    roleLabel.setAttribute("y", y + bannerHeight + 16);
    roleLabel.setAttribute("text-anchor", "middle");
    roleLabel.setAttribute("font-size", "12px");
    roleLabel.setAttribute("fill", "#666");
    roleLabel.setAttribute("font-family", "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif");
    roleLabel.textContent = roleText;
    
    boxGroup.appendChild(roleLabel);
    
    // Add to the boxes group
    this.boxesGroup.appendChild(boxGroup);
    
    return boxGroup;
  }
  
  createNode(x, y, radius, type, count, instanceType, boxX, boxY, boxWidth, boxHeight) {
    const nodeGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    nodeGroup.setAttribute("class", `node ${type}-node`);
    nodeGroup.setAttribute("transform", `translate(${x}, ${y})`);
    nodeGroup.setAttribute("data-box-x", boxX);
    nodeGroup.setAttribute("data-box-y", boxY);
    nodeGroup.setAttribute("data-box-width", boxWidth);
    nodeGroup.setAttribute("data-box-height", boxHeight);
    nodeGroup.setAttribute("data-original-x", x);
    nodeGroup.setAttribute("data-original-y", y);
    nodeGroup.setAttribute("data-type", type);
    
    // Choose color based on node type
    let color;
    let label;
    let roleDescription = "";
    let memoryInfo = "";
    let cpuInfo = "";
    
    switch (type) {
      case "master":
        color = this.colors.master;
        label = "Master";
        roleDescription = "Coordinates cluster operations and maintains state";
        memoryInfo = this.getMemoryForInstanceType(instanceType);
        cpuInfo = this.getCPUsForInstanceType(instanceType);
        break;
      case "hot":
        color = this.colors.hot;
        label = "Hot";
        roleDescription = "Stores and processes recent, frequently-accessed data";
        memoryInfo = this.getMemoryForInstanceType(instanceType);
        cpuInfo = this.getCPUsForInstanceType(instanceType);
        break;
      case "ml":
        color = this.colors.ml;
        label = "ML";
        roleDescription = "Handles machine learning jobs and analytics";
        memoryInfo = this.getMemoryForInstanceType(instanceType);
        cpuInfo = this.getCPUsForInstanceType(instanceType);
        break;
      case "frozen":
        color = this.colors.frozen;
        label = "Frozen";
        roleDescription = "Stores historical data optimized for less frequent access";
        memoryInfo = this.getMemoryForInstanceType(instanceType);
        cpuInfo = this.getCPUsForInstanceType(instanceType);
        break;
      case "helper":
        color = this.colors.helper;
        label = "Console";
        roleDescription = "Manages cluster, runs Kibana, monitoring, and collects metrics";
        memoryInfo = "4 GiB";
        cpuInfo = "2 vCPU";
        break;
      default:
        color = this.colors.other;
        label = "Node";
        roleDescription = "General purpose node";
        memoryInfo = "Unknown";
        cpuInfo = "Unknown";
    }
    
    // For displaying nodes, use improved layout algorithm
    const maxVisibleNodes = 5; // Show max 5 nodes per type
    const visibleCount = Math.min(count, maxVisibleNodes);
    
    // Calculate grid dimensions
    let cols = Math.min(3, visibleCount);
    if (visibleCount === 4) cols = 2; // Better arrangement for 4 nodes
    
    const rows = Math.ceil(visibleCount / cols);
    
    // Create node clusters
    for (let i = 0; i < visibleCount; i++) {
      // Calculate position offset for multiple nodes
      const col = i % cols;
      const row = Math.floor(i / cols);
      
      // Calculate offsets (center the grid)
      let offsetX = (col - (cols - 1) / 2) * (radius * 2.5);
      let offsetY = (row - (rows - 1) / 2) * (radius * 2.5);
      
      // Improve visual balance
      if (cols === 2 && visibleCount === 4) {
        offsetX = col * radius * 3 - radius * 1.5;
      }
      
      // Create individual node circle with enhanced styling
      const nodeCircle = document.createElementNS("http://www.w3.org/2000/svg", "g");
      nodeCircle.setAttribute("class", "node-circle");
      nodeCircle.setAttribute("transform", `translate(${offsetX}, ${offsetY})`);
      
      // Create glow effect with gradient for more depth
      const gradientId = `node-gradient-${type}-${i}-${Math.random().toString(36).substring(2, 9)}`;
      const gradient = document.createElementNS("http://www.w3.org/2000/svg", "radialGradient");
      gradient.setAttribute("id", gradientId);
      gradient.setAttribute("cx", "0.5");
      gradient.setAttribute("cy", "0.5");
      gradient.setAttribute("r", "0.5");
      gradient.setAttribute("fx", "0.3");
      gradient.setAttribute("fy", "0.3");
      
      const stop1 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
      stop1.setAttribute("offset", "0%");
      stop1.setAttribute("stop-color", this.lightenColor(color, 20));
      
      const stop2 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
      stop2.setAttribute("offset", "100%");
      stop2.setAttribute("stop-color", this.darkenColor(color, 10));
      
      gradient.appendChild(stop1);
      gradient.appendChild(stop2);
      
      // Ensure defs section exists
      let defs = this.svg.querySelector("defs");
      if (!defs) {
        defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
        this.svg.appendChild(defs);
      }
      defs.appendChild(gradient);
      
      // Add shadow filter if it doesn't exist
      if (!defs.querySelector("#node-shadow")) {
        const filter = document.createElementNS("http://www.w3.org/2000/svg", "filter");
        filter.setAttribute("id", "node-shadow");
        filter.setAttribute("x", "-50%");
        filter.setAttribute("y", "-50%");
        filter.setAttribute("width", "200%");
        filter.setAttribute("height", "200%");
        
        // Shadow effect
        const feDropShadow = document.createElementNS("http://www.w3.org/2000/svg", "feDropShadow");
        feDropShadow.setAttribute("dx", "0");
        feDropShadow.setAttribute("dy", "1");
        feDropShadow.setAttribute("stdDeviation", "2");
        feDropShadow.setAttribute("flood-opacity", "0.3");
        feDropShadow.setAttribute("flood-color", "rgba(0,0,0,0.5)");
        
        filter.appendChild(feDropShadow);
        defs.appendChild(filter);
      }
      
      // Create node circle with gradient and shadow
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", 0);
      circle.setAttribute("cy", 0);
      circle.setAttribute("r", radius);
      circle.setAttribute("fill", `url(#${gradientId})`);
      circle.setAttribute("stroke", "#fff");
      circle.setAttribute("stroke-width", "2");
      circle.setAttribute("filter", "url(#node-shadow)");
      
      nodeCircle.appendChild(circle);
      
      // Add icon inside circle with improved styling
      let iconText = "";
      switch (type) {
        case "master": iconText = "M"; break;
        case "hot": iconText = "H"; break;
        case "ml": iconText = "ML"; break;
        case "frozen": iconText = "F"; break;
        case "helper": iconText = "👨‍💻"; break;
      }
      
      const iconBg = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      iconBg.setAttribute("cx", 0);
      iconBg.setAttribute("cy", 0);
      iconBg.setAttribute("r", radius-4);
      iconBg.setAttribute("fill", "rgba(255,255,255,0.2)");
      
      const iconText1 = document.createElementNS("http://www.w3.org/2000/svg", "text");
      iconText1.setAttribute("x", 0);
      iconText1.setAttribute("y", 5);
      iconText1.setAttribute("text-anchor", "middle");
      iconText1.setAttribute("font-size", type === "ml" ? "10px" : "12px");
      iconText1.setAttribute("font-weight", "bold");
      iconText1.setAttribute("fill", "#ffffff");
      iconText1.setAttribute("font-family", "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif");
      iconText1.textContent = iconText;
      
      nodeCircle.appendChild(iconBg);
      nodeCircle.appendChild(iconText1);
      
      // Pulse animation for the nodes
      const pulseAnimation = document.createElementNS("http://www.w3.org/2000/svg", "animate");
      pulseAnimation.setAttribute("attributeName", "opacity");
      pulseAnimation.setAttribute("values", "1;0.8;1");
      pulseAnimation.setAttribute("dur", "2s");
      pulseAnimation.setAttribute("repeatCount", "indefinite");
      pulseAnimation.setAttribute("begin", `${i * 0.3}s`); // Stagger animations
      
      circle.appendChild(pulseAnimation);
      
      nodeGroup.appendChild(nodeCircle);
    }
    
    // If there are more nodes than we can show, add an improved counter badge
    if (count > maxVisibleNodes) {
      const extraCount = count - maxVisibleNodes;
      
      // Create badge background with pill shape
      const badgeBg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      const textWidth = extraCount.toString().length * 10 + 20;
      badgeBg.setAttribute("x", -textWidth/2);
      badgeBg.setAttribute("y", radius * 2.2);
      badgeBg.setAttribute("width", textWidth);
      badgeBg.setAttribute("height", 20);
      badgeBg.setAttribute("rx", 10);
      badgeBg.setAttribute("fill", color);
      badgeBg.setAttribute("opacity", "0.9");
      
      // Badge text with "+X more" 
      const moreText = document.createElementNS("http://www.w3.org/2000/svg", "text");
      moreText.setAttribute("x", 0);
      moreText.setAttribute("y", radius * 2.2 + 14);
      moreText.setAttribute("text-anchor", "middle");
      moreText.setAttribute("font-size", "12px");
      moreText.setAttribute("font-weight", "bold");
      moreText.setAttribute("fill", "#ffffff");
      moreText.setAttribute("font-family", "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif");
      moreText.textContent = `+${extraCount} more`;
      
      nodeGroup.appendChild(badgeBg);
      nodeGroup.appendChild(moreText);
    }
    
    // Add instance type indicator below nodes
    const instanceBadge = document.createElementNS("http://www.w3.org/2000/svg", "g");
    instanceBadge.setAttribute("transform", `translate(0, ${radius * 3})`);
    
    // Instance type box
    const instanceBg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    const instanceWidth = 110;
    instanceBg.setAttribute("x", -instanceWidth/2);
    instanceBg.setAttribute("y", 0);
    instanceBg.setAttribute("width", instanceWidth);
    instanceBg.setAttribute("height", 40);
    instanceBg.setAttribute("rx", 5);
    instanceBg.setAttribute("fill", "white");
    instanceBg.setAttribute("stroke", this.colors.boxBorder);
    instanceBg.setAttribute("stroke-width", "1");
    
    // Instance type label
    const instanceLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
    instanceLabel.setAttribute("x", 0);
    instanceLabel.setAttribute("y", 16);
    instanceLabel.setAttribute("text-anchor", "middle");
    instanceLabel.setAttribute("font-size", "12px");
    instanceLabel.setAttribute("font-weight", "bold");
    instanceLabel.setAttribute("fill", "#333");
    instanceLabel.setAttribute("font-family", "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif");
    instanceLabel.textContent = instanceType;
    
    // CPU/Memory stats
    const memoryText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    memoryText.setAttribute("x", 0);
    memoryText.setAttribute("y", 32);
    memoryText.setAttribute("text-anchor", "middle");
    memoryText.setAttribute("font-size", "10px");
    memoryText.setAttribute("fill", "#666");
    memoryText.setAttribute("font-family", "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif");
    memoryText.textContent = `${cpuInfo} | ${memoryInfo}`;
    
    instanceBadge.appendChild(instanceBg);
    instanceBadge.appendChild(instanceLabel);
    instanceBadge.appendChild(memoryText);
    
    nodeGroup.appendChild(instanceBadge);
    
    // Create an invisible overlay for easier hovering and tooltip
    const overlay = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    overlay.setAttribute("x", -boxWidth/2);
    overlay.setAttribute("y", -radius * 2);
    overlay.setAttribute("width", boxWidth);
    overlay.setAttribute("height", radius * 6 + 40);
    overlay.setAttribute("fill", "transparent");
    overlay.setAttribute("class", "node-hover-area");
    
    // Enhanced tooltip data
    nodeGroup.setAttribute("data-tooltip", `
      <div class="node-tooltip">
        <h5 style="color:${color};">${label} ${type !== "helper" ? "Nodes" : "Node"}</h5>
        <div><strong>Count:</strong> ${count}</div>
        <div><strong>Instance:</strong> ${instanceType}</div>
        <div><strong>CPU:</strong> ${cpuInfo}</div>
        <div><strong>Memory:</strong> ${memoryInfo}</div>
        <div><strong>Role:</strong> ${roleDescription}</div>
        <div class="mt-2 small text-muted"><i class="fas fa-arrows-alt"></i> Drag to reposition</div>
      </div>
    `);
    
    nodeGroup.appendChild(overlay);
    
    // Make the node draggable
    this.makeNodeDraggable(nodeGroup);
    
    this.nodesGroup.appendChild(nodeGroup);
    return nodeGroup;
  }
  
  // Add node dragging functionality
  makeNodeDraggable(nodeGroup) {
    let isDragging = false;
    let startX, startY, originalX, originalY;
    
    // Find the corresponding box for this node
    const nodeType = nodeGroup.getAttribute('data-type');
    
    // Mouse down handler for node
    nodeGroup.addEventListener('mousedown', (e) => {
      // Only start dragging on left mouse button and if not in diagram panning mode
      if (e.button !== 0 || this.isDragging) return;
      
      // Prevent event from bubbling to diagram pan handler
      e.stopPropagation();
      
      // Get current position of the node
      const transform = nodeGroup.getAttribute('transform');
      const match = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
      if (match) {
        const originalX = parseFloat(match[1]);
        const originalY = parseFloat(match[2]);
        
        const startX = e.clientX;
        const startY = e.clientY;
        
        // Capture the box position at start of drag
        const box = this.boxesGroup.querySelector(`.${nodeType}-box`);
        if (box) {
          const boxRect = box.querySelector('rect');
          if (boxRect) {
            const boxX = parseFloat(boxRect.getAttribute("x"));
            const boxY = parseFloat(boxRect.getAttribute("y"));
            nodeGroup.setAttribute("data-original-box-x", boxX);
            nodeGroup.setAttribute("data-original-box-y", boxY);
            
            // Calculate the offset between node and box
            const offsetX = boxX - originalX;
            const offsetY = boxY - originalY;
            nodeGroup.setAttribute("data-node-box-offset-x", offsetX);
            nodeGroup.setAttribute("data-node-box-offset-y", offsetY);
          }
        }
        
        // Update node's drag state
        nodeGroup.dragState = {
          isDragging: true,
          startX: startX,
          startY: startY,
          originalX: originalX,
          originalY: originalY,
          nodeType: nodeType
        };
        
        // Add dragging class to node for styling
        nodeGroup.classList.add('dragging-node');
        
        // Show helper instruction
        const dragHelper = document.createElement('div');
        dragHelper.className = 'node-drag-helper';
        dragHelper.innerHTML = '<i class="fas fa-arrows-alt"></i> Drag to reposition';
        dragHelper.style.position = 'absolute';
        dragHelper.style.left = (e.clientX + 10) + 'px';
        dragHelper.style.top = (e.clientY + 10) + 'px';
        dragHelper.style.background = 'rgba(0,0,0,0.7)';
        dragHelper.style.color = 'white';
        dragHelper.style.padding = '5px 10px';
        dragHelper.style.borderRadius = '3px';
        dragHelper.style.fontSize = '12px';
        dragHelper.style.zIndex = '9999';
        document.body.appendChild(dragHelper);
        
        // Store reference to remove later
        this.dragHelper = dragHelper;
      }
    });
    
    // Add mousemove handler to document
    document.addEventListener('mousemove', this.handleNodeDrag.bind(this));
    document.addEventListener('mouseup', this.handleNodeDragEnd.bind(this));
    
    // Store node's dragging state in the node itself
    nodeGroup.isDragging = false;
    
    // Add drag state to the node
    nodeGroup.dragState = {
      isDragging: false,
      startX: 0,
      startY: 0,
      originalX: 0,
      originalY: 0,
      nodeType: nodeType
    };
  }
  
  // Handle node dragging
  handleNodeDrag(e) {
    // Find which node is being dragged, if any
    const dragNode = this.findDraggingNode();
    if (!dragNode) return;
    
    const { isDragging, startX, startY, originalX, originalY, nodeType } = dragNode.dragState;
    
    if (isDragging) {
      // Calculate new position
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      
      // Apply translation to SVG viewBox coordinates
      const scale = this.viewportTransform.scale;
      const newX = originalX + dx / scale;
      const newY = originalY + dy / scale;
      
      // Update node position
      dragNode.setAttribute('transform', `translate(${newX}, ${newY})`);
      
      // Update node's data attributes for connection redrawing
      dragNode.setAttribute("data-box-x", dragNode.getAttribute("data-original-box-x") ? 
                           parseFloat(dragNode.getAttribute("data-original-box-x")) + dx / scale : 0);
      dragNode.setAttribute("data-box-y", dragNode.getAttribute("data-original-box-y") ? 
                           parseFloat(dragNode.getAttribute("data-original-box-y")) + dy / scale : 0);
      
      // Direct update of the box position
      const box = this.boxesGroup.querySelector(`.${nodeType}-box`);
      if (box) {
        // On first drag, store the initial box position and dimensions
        if (!dragNode.getAttribute("data-original-box-x")) {
          const mainRect = box.querySelector('rect');
          if (mainRect) {
            const boxX = parseFloat(mainRect.getAttribute("x"));
            const boxY = parseFloat(mainRect.getAttribute("y"));
            const boxWidth = parseFloat(mainRect.getAttribute("width"));
            const boxHeight = parseFloat(mainRect.getAttribute("height"));
            
            dragNode.setAttribute("data-original-box-x", boxX);
            dragNode.setAttribute("data-original-box-y", boxY);
            dragNode.setAttribute("data-box-width", boxWidth);
            dragNode.setAttribute("data-box-height", boxHeight);
          }
        }
        
        // Move the box by the same amount the node moved
        const boxElements = box.getElementsByTagName('*');
        for (let i = 0; i < boxElements.length; i++) {
          const el = boxElements[i];
          if (el.tagName === 'rect') {
            if (!el.hasAttribute('data-original-x')) {
              el.setAttribute('data-original-x', el.getAttribute('x'));
              el.setAttribute('data-original-y', el.getAttribute('y'));
            }
            
            const origX = parseFloat(el.getAttribute('data-original-x'));
            const origY = parseFloat(el.getAttribute('data-original-y'));
            
            el.setAttribute('x', origX + dx / scale);
            el.setAttribute('y', origY + dy / scale);
          } 
          else if (el.tagName === 'text') {
            if (!el.hasAttribute('data-original-x')) {
              el.setAttribute('data-original-x', el.getAttribute('x'));
              el.setAttribute('data-original-y', el.getAttribute('y'));
            }
            
            const origX = parseFloat(el.getAttribute('data-original-x'));
            const origY = parseFloat(el.getAttribute('data-original-y'));
            
            el.setAttribute('x', origX + dx / scale);
            el.setAttribute('y', origY + dy / scale);
          }
        }
        
        // Also need to handle the clip path if present
        const clipPathId = box.querySelector('rect[clip-path]')?.getAttribute('clip-path')?.match(/url\(#(.*)\)/)?.[1];
        if (clipPathId) {
          const clipPath = document.getElementById(clipPathId);
          if (clipPath) {
            const clipRect = clipPath.querySelector('rect');
            if (clipRect) {
              if (!clipRect.hasAttribute('data-original-x')) {
                clipRect.setAttribute('data-original-x', clipRect.getAttribute('x'));
                clipRect.setAttribute('data-original-y', clipRect.getAttribute('y'));
              }
              
              const origX = parseFloat(clipRect.getAttribute('data-original-x'));
              const origY = parseFloat(clipRect.getAttribute('data-original-y'));
              
              clipRect.setAttribute('x', origX + dx / scale);
              clipRect.setAttribute('y', origY + dy / scale);
            }
          }
        }
      }
      
      // Now we need to update connections to remain attached to the box edges
      this.updateAllConnections();
      
      // Update drag helper position if present
      if (this.dragHelper) {
        this.dragHelper.style.left = (e.clientX + 10) + 'px';
        this.dragHelper.style.top = (e.clientY + 10) + 'px';
      }
    }
  }
  
  // Handle end of node dragging
  handleNodeDragEnd(e) {
    // Find which node is being dragged, if any
    const dragNode = this.findDraggingNode();
    if (!dragNode) return;
    
    // End dragging state
    dragNode.dragState.isDragging = false;
    dragNode.classList.remove('dragging-node');
    
    // Remove drag helper if present
    if (this.dragHelper) {
      document.body.removeChild(this.dragHelper);
      this.dragHelper = null;
    }
    
    // Reset original position data attributes for next drag
    const nodeType = dragNode.getAttribute('data-type');
    const box = this.boxesGroup.querySelector(`.${nodeType}-box`);
    
    if (box) {
      // Update original positions for the next drag
      // Get current box position from first rectangle
      const mainRect = box.querySelector('rect');
      if (mainRect) {
        // Clear original position data to force recalculation on next drag
        dragNode.removeAttribute("data-original-box-x");
        dragNode.removeAttribute("data-original-box-y");
        
        // Clear original positions from all elements
        const boxElements = box.getElementsByTagName('*');
        for (let i = 0; i < boxElements.length; i++) {
          const el = boxElements[i];
          el.removeAttribute('data-original-x');
          el.removeAttribute('data-original-y');
        }
        
        // Clear clip path original positions too
        const clipPathId = box.querySelector('rect[clip-path]')?.getAttribute('clip-path')?.match(/url\(#(.*)\)/)?.[1];
        if (clipPathId) {
          const clipPath = document.getElementById(clipPathId);
          if (clipPath) {
            const clipRect = clipPath.querySelector('rect');
            if (clipRect) {
              clipRect.removeAttribute('data-original-x');
              clipRect.removeAttribute('data-original-y');
            }
          }
        }
      }
    }
    
    // Update all connections
    this.updateAllConnections();
  }
  
  // Find which node is currently being dragged
  findDraggingNode() {
    const nodes = this.nodesGroup.querySelectorAll('.node');
    for (const node of nodes) {
      if (node.dragState && node.dragState.isDragging) {
        return node;
      }
    }
    return null;
  }
  
  // Update connections for a specific node
  updateConnectionsForNode(node) {
    // Clear existing connections
    this.connections.forEach(conn => {
      // Check if this connection involves the dragged node
      // This would require tracking which nodes each connection links
      // For simplicity, we'll just redraw all connections
    });
    
    // Redraw all connections
    this.updateAllConnections();
  }
  
  // Update all connections
  updateAllConnections() {
    // For simplicity, we just redraw all connections
    // A more optimized approach would be to only update affected connections
    
    // First, store all the connection information
    const connectionInfo = [];
    this.connections.forEach(conn => {
      // Extract connection details (from/to nodes, type)
      // This would require storing node references with each connection
      // For simplicity, we just redraw the configured connections
    });
    
    // Clear connections
    while (this.connectionsGroup.firstChild) {
      this.connectionsGroup.removeChild(this.connectionsGroup.firstChild);
    }
    this.connections = [];
    this.monitoringConnections = [];
    
    // Redraw standard connections based on current node positions
    const helperNode = this.findNodeByType('helper');
    const masterNode = this.findNodeByType('master');
    const hotNode = this.findNodeByType('hot');
    const mlNode = this.findNodeByType('ml');
    const frozenNode = this.findNodeByType('frozen');
    
    // Recreate connections with updated positions
    if (helperNode && masterNode) {
      this.createConnection(helperNode, masterNode);
    }
    
    if (masterNode && hotNode) {
      this.createConnection(masterNode, hotNode);
    }
    
    if (hotNode && mlNode) {
      this.createConnection(hotNode, mlNode);
    }
    
    if (hotNode && frozenNode) {
      this.createConnection(hotNode, frozenNode);
    }
    
    // Recreate data connections
    if (helperNode && hotNode) {
      this.createConnection(helperNode, hotNode, "data");
    }
    
    // Recreate monitoring connections
    if (mlNode && helperNode) {
      this.createConnection(mlNode, helperNode, "monitoring");
    }
    
    if (frozenNode && helperNode) {
      this.createConnection(frozenNode, helperNode, "monitoring");
    }
    
    if (hotNode && helperNode) {
      this.createConnection(hotNode, helperNode, "monitoring");
    }
    
    if (masterNode && helperNode) {
      this.createConnection(masterNode, helperNode, "monitoring");
    }
    
    // Recreate any active flow connections
    this.recreateActiveFlows();
  }
  
  // Helper to find node by type
  findNodeByType(type) {
    return this.nodesGroup.querySelector(`.${type}-node`);
  }
  
  // Recreate any active flow visualizations
  recreateActiveFlows() {
    // Check which flows are active by looking at the toggle buttons
    const flowToggles = this.mainGroup.querySelectorAll('.flow-toggle');
    flowToggles.forEach(toggle => {
      if (toggle.flowActive) {
        const flowType = toggle.getAttribute('data-flow');
        this.showDataFlow(flowType);
      }
    });
  }
  
  createConnection(fromNode, toNode, connectionType = "normal") {
    // Get box coordinates from the data attributes
    const fromBoxX = parseFloat(fromNode.getAttribute("data-box-x"));
    const fromBoxY = parseFloat(fromNode.getAttribute("data-box-y"));
    const fromBoxWidth = parseFloat(fromNode.getAttribute("data-box-width"));
    const fromBoxHeight = parseFloat(fromNode.getAttribute("data-box-height"));
    
    const toBoxX = parseFloat(toNode.getAttribute("data-box-x"));
    const toBoxY = parseFloat(toNode.getAttribute("data-box-y"));
    const toBoxWidth = parseFloat(toNode.getAttribute("data-box-width"));
    const toBoxHeight = parseFloat(toNode.getAttribute("data-box-height"));
    
    // Calculate connection points on the edges of the boxes
    let x1, y1, x2, y2;
    
    // Determine direction of connection
    if (fromBoxY + fromBoxHeight < toBoxY) {
      // From box is above to box
      x1 = fromBoxX + fromBoxWidth / 2;
      y1 = fromBoxY + fromBoxHeight;
      x2 = toBoxX + toBoxWidth / 2;
      y2 = toBoxY;
    } else if (fromBoxY > toBoxY + toBoxHeight) {
      // From box is below to box
      x1 = fromBoxX + fromBoxWidth / 2;
      y1 = fromBoxY;
      x2 = toBoxX + toBoxWidth / 2;
      y2 = toBoxY + toBoxHeight;
    } else if (fromBoxX + fromBoxWidth < toBoxX) {
      // From box is to the left of to box
      x1 = fromBoxX + fromBoxWidth;
      y1 = fromBoxY + fromBoxHeight / 2;
      x2 = toBoxX;
      y2 = toBoxY + toBoxHeight / 2;
    } else {
      // From box is to the right of to box
      x1 = fromBoxX;
      y1 = fromBoxY + fromBoxHeight / 2;
      x2 = toBoxX + toBoxWidth;
      y2 = toBoxY + toBoxHeight / 2;
    }
    
    // Calculate control points for smoother curved line
    const dx = x2 - x1;
    const dy = y2 - y1;
    
    // Improved curve control points for more elegant path
    const offset = Math.min(80, Math.abs(dx) * 0.4);
    let cp1x, cp1y, cp2x, cp2y;
    
    if (Math.abs(dx) > Math.abs(dy)) {
      // More horizontal than vertical - smoother horizontal curve
      cp1x = x1 + Math.sign(dx) * offset;
      cp1y = y1;
      cp2x = x2 - Math.sign(dx) * offset;
      cp2y = y2;
    } else {
      // More vertical than horizontal - smoother vertical curve
      cp1x = x1;
      cp1y = y1 + Math.sign(dy) * offset;
      cp2x = x2;
      cp2y = y2 - Math.sign(dy) * offset;
    }
    
    // Create path for curved line
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", `M${x1},${y1} C${cp1x},${cp1y} ${cp2x},${cp2y} ${x2},${y2}`);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    
    // Set color and style based on connection type
    let connectionColor;
    let markerId;
    let dashArray = "none";
    let strokeWidth = "1.5";
    
    switch (connectionType) {
      case "monitoring":
        connectionColor = this.colors.monitoringConnection;
        markerId = "monitoring-arrow";
        dashArray = "5,3";
        break;
      case "data":
        connectionColor = this.colors.dataConnection;
        markerId = "data-arrow";
        strokeWidth = "2";
        break;
      default:
        connectionColor = this.colors.connection;
        markerId = "cluster-arrow";
    }
    
    path.setAttribute("stroke", connectionColor);
    path.setAttribute("stroke-width", strokeWidth);
    path.setAttribute("stroke-dasharray", dashArray);
    path.setAttribute("marker-end", `url(#${markerId})`);
    path.setAttribute("class", `connection ${connectionType}-connection`);
    
    // Add to appropriate connection group
    this.connectionsGroup.appendChild(path);
    
    if (connectionType === "monitoring") {
      this.monitoringConnections.push(path);
      // Initially hide monitoring connections
      if (!this.showMonitoringOverlay) {
        path.style.display = "none";
      }
    } else {
      this.connections.push(path);
    }
    
    // Add animated traffic dots for data and monitoring connections
    if (connectionType === "data" || connectionType === "monitoring") {
      this.addTrafficDot(path, connectionType);
    }
    
    return path;
  }
  
  addTrafficDot(path, type) {
    // Create animated dot to show traffic flow
    const animatedDot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    animatedDot.setAttribute("r", "3");
    animatedDot.setAttribute("fill", type === "data" ? this.colors.dataConnection : this.colors.monitoringConnection);
    animatedDot.setAttribute("class", "traffic-dot");
    
    // Add animation path
    const animateMotion = document.createElementNS("http://www.w3.org/2000/svg", "animateMotion");
    animateMotion.setAttribute("dur", type === "data" ? "3s" : "4s");
    animateMotion.setAttribute("repeatCount", "indefinite");
    animateMotion.setAttribute("path", path.getAttribute("d"));
    
    animatedDot.appendChild(animateMotion);
    
    // Only show dots if this is a visible connection
    if (type === "monitoring" && !this.showMonitoringOverlay) {
      animatedDot.style.display = "none";
    }
    
    // Add to connection group and track with the connection
    this.connectionsGroup.appendChild(animatedDot);
    
    if (type === "monitoring") {
      this.monitoringConnections.push(animatedDot);
    }
    
    return animatedDot;
  }
  
  createLegend() {
    const legend = document.createElementNS("http://www.w3.org/2000/svg", "g");
    legend.setAttribute("class", "node-legend");
    legend.setAttribute("transform", `translate(20, ${this.height - 40})`);
    
    const legendData = [
      { color: this.colors.helper, text: "Console Node" },
      { color: this.colors.master, text: "Master Nodes" },
      { color: this.colors.hot, text: "Hot Nodes" },
      { color: this.colors.ml, text: "ML Nodes" },
      { color: this.colors.frozen, text: "Frozen Nodes" }
    ];
    
    legendData.forEach((item, index) => {
      const x = index * 150;
      
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", x + 8);
      circle.setAttribute("cy", 8);
      circle.setAttribute("r", 8);
      circle.setAttribute("fill", item.color);
      
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", x + 20);
      text.setAttribute("y", 12);
      text.setAttribute("fill", "#333333");
      text.setAttribute("font-size", "12px");
      text.textContent = item.text;
      
      legend.appendChild(circle);
      legend.appendChild(text);
    });
    
    // Add connection types
    const connectionLegend = document.createElementNS("http://www.w3.org/2000/svg", "g");
    connectionLegend.setAttribute("transform", `translate(20, ${this.height - 70})`);
    
    const connectionTypes = [
      { color: this.colors.connection, text: "Cluster Traffic", dashArray: "none" },
      { color: this.colors.dataConnection, text: "Data Flow", dashArray: "none" },
      { color: this.colors.monitoringConnection, text: "Monitoring Traffic", dashArray: "5,3" }
    ];
    
    connectionTypes.forEach((item, index) => {
      const x = index * 150;
      
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", x);
      line.setAttribute("y1", 8);
      line.setAttribute("x2", x + 30);
      line.setAttribute("y2", 8);
      line.setAttribute("stroke", item.color);
      line.setAttribute("stroke-width", "2");
      line.setAttribute("stroke-dasharray", item.dashArray);
      
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", x + 35);
      text.setAttribute("y", 12);
      text.setAttribute("fill", "#333333");
      text.setAttribute("font-size", "12px");
      text.textContent = item.text;
      
      connectionLegend.appendChild(line);
      connectionLegend.appendChild(text);
    });
    
    this.svg.appendChild(connectionLegend);
    this.svg.appendChild(legend);
  }
  
  setupEventListeners() {
    // Add change listeners to all form fields that affect the diagram
    Object.values(this.formFields).forEach(field => {
      if (field) {
        field.addEventListener('change', () => this.update());
        field.addEventListener('input', () => this.update());
      }
    });
    
    // Also listen for range inputs
    const hotNodeRange = document.getElementById('hot_node_range');
    const mlNodeRange = document.getElementById('ml_node_range');
    const frozenNodeRange = document.getElementById('frozen_node_range');
    
    if (hotNodeRange) hotNodeRange.addEventListener('input', () => this.update());
    if (mlNodeRange) mlNodeRange.addEventListener('input', () => this.update());
    if (frozenNodeRange) frozenNodeRange.addEventListener('input', () => this.update());
    
    // Removed view buttons event listeners as requested
    
    // Setup tooltip handlers
    this.setupTooltipListeners();
    
    // Add pan/drag event listeners
    this.svg.addEventListener('mousedown', this.handleMouseDown.bind(this));
    document.addEventListener('mousemove', this.handleMouseMove.bind(this));
    document.addEventListener('mouseup', this.handleMouseUp.bind(this));
    
    // Add wheel event for zoom
    this.svg.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });
    
    // Handle window resize for responsiveness
    window.addEventListener('resize', () => this.handleResize());
  }
  
  handleMouseDown(event) {
    // Only initiate drag with left mouse button and not on interactive elements
    if (event.button !== 0 || 
        event.target.closest('.node') || 
        event.target.closest('.flow-toggle') ||
        event.target.closest('.fullscreen-toggle') ||
        event.target.closest('.monitoring-toggle') ||
        event.target.closest('.diagram-controls')) {
      return;
    }
    
    this.isDragging = true;
    this.dragStart = {
      x: event.clientX,
      y: event.clientY,
      translateX: this.viewportTransform.translateX,
      translateY: this.viewportTransform.translateY
    };
    
    // Change cursor to indicate dragging
    this.svg.style.cursor = 'grabbing';
    this.svg.classList.add('dragging');
    event.preventDefault();
  }
  
  handleMouseMove(event) {
    if (!this.isDragging) return;
    
    const dx = event.clientX - this.dragStart.x;
    const dy = event.clientY - this.dragStart.y;
    
    // Apply scaling factor to make dragging feel natural at different zoom levels
    this.viewportTransform.translateX = this.dragStart.translateX + dx / this.viewportTransform.scale;
    this.viewportTransform.translateY = this.dragStart.translateY + dy / this.viewportTransform.scale;
    
    this.updateViewportTransform();
    event.preventDefault();
  }
  
  handleMouseUp(event) {
    if (this.isDragging) {
      this.isDragging = false;
      this.svg.style.cursor = 'grab';
      this.svg.classList.remove('dragging');
      event.preventDefault();
    }
  }
  
  handleWheel(event) {
    event.preventDefault();
    
    // Get mouse position relative to SVG
    const svgRect = this.svg.getBoundingClientRect();
    const mouseX = event.clientX - svgRect.left;
    const mouseY = event.clientY - svgRect.top;
    
    // Convert mouse position to SVG coordinates before zoom
    const svgCoordsX = mouseX / this.viewportTransform.scale - this.viewportTransform.translateX;
    const svgCoordsY = mouseY / this.viewportTransform.scale - this.viewportTransform.translateY;
    
    // Calculate new scale factor
    const scaleFactor = event.deltaY < 0 ? 1.1 : 0.9;
    const newScale = Math.max(0.25, Math.min(2.5, this.viewportTransform.scale * scaleFactor));
    
    // Only update if scale actually changes
    if (newScale !== this.viewportTransform.scale) {
      // Calculate new translation to zoom in/out from mouse position
      this.viewportTransform.translateX = -(svgCoordsX * newScale - mouseX) / newScale;
      this.viewportTransform.translateY = -(svgCoordsY * newScale - mouseY) / newScale;
      this.viewportTransform.scale = newScale;
      
      this.updateViewportTransform();
    }
  }
  
  handleResize() {
    // Only update if container exists and is visible
    if (this.container && this.container.offsetWidth > 0) {
      const containerWidth = this.container.clientWidth;
      const containerHeight = this.container.clientHeight;
      
      // Only redraw if size changed significantly
      if (Math.abs(containerWidth - this.width) > 50 || 
          Math.abs(containerHeight - this.height) > 50) {
        
        // Save current viewport transformation
        const oldTransform = { ...this.viewportTransform };
        
        this.width = Math.max(containerWidth, 800);
        this.height = Math.max(containerHeight, 600);
        
        // Update SVG dimensions
        this.svg.setAttribute("width", "100%");
        this.svg.setAttribute("height", "100%");
        
        // Redraw diagram with new dimensions
        this.update();
        
        // After updating, calculate appropriate viewport to see all content
        setTimeout(() => {
          const bbox = this.mainGroup.getBBox();
          const padding = 30;
          
          // Calculate scale to fit entire diagram with padding
          const scaleX = this.width / (bbox.width + padding * 2);
          const scaleY = this.height / (bbox.height + padding * 2);
          const scale = Math.min(scaleX, scaleY, 1);
          
          // Center the diagram
          const centerX = (this.width - bbox.width * scale) / 2 - bbox.x * scale;
          const centerY = (this.height - bbox.height * scale) / 2 - bbox.y * scale;
          
          this.viewportTransform = {
            scale: scale,
            translateX: centerX / scale,
            translateY: centerY / scale
          };
          
          this.updateViewportTransform();
        }, 100);
      }
    }
  }
  
  resetView() {
    // Reset the viewport transformation
    this.viewportTransform = {
      scale: 1,
      translateX: 0,
      translateY: 0
    };
    
    this.updateViewportTransform();
    
    // After resetting, ensure we can see all content
    setTimeout(() => {
      const bbox = this.mainGroup.getBBox();
      const padding = 30;
      
      // Calculate scale to fit entire diagram with padding
      const scaleX = this.width / (bbox.width + padding * 2);
      const scaleY = this.height / (bbox.height + padding * 2);
      const scale = Math.min(scaleX, scaleY, 1);
      
      // Center the diagram
      const centerX = (this.width - bbox.width * scale) / 2 - bbox.x * scale;
      const centerY = (this.height - bbox.height * scale) / 2 - bbox.y * scale;
      
      this.viewportTransform = {
        scale: scale,
        translateX: centerX / scale,
        translateY: centerY / scale
      };
      
      this.updateViewportTransform();
    }, 100);
  }
  
  addZoomControls() {
    // Only add zoom controls in modal view
    if (this.container && this.container.id === 'modal-cluster-diagram') {
      const zoomGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
      zoomGroup.setAttribute("class", "diagram-controls");
      zoomGroup.setAttribute("transform", `translate(${this.width - 100}, ${this.height - 140})`);
      
      // Create zoom controls background
      const controlsBg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      controlsBg.setAttribute("width", 80);
      controlsBg.setAttribute("height", 120);
      controlsBg.setAttribute("rx", 8);
      controlsBg.setAttribute("fill", "white");
      controlsBg.setAttribute("stroke", "#e0e0e0");
      controlsBg.setAttribute("fill-opacity", "0.9");
      zoomGroup.appendChild(controlsBg);
      
      // Zoom in button
      this.createZoomButton(zoomGroup, 40, 30, "+", () => {
        // Scale from center of view
        const svgRect = this.svg.getBoundingClientRect();
        const centerX = svgRect.width / 2;
        const centerY = svgRect.height / 2;
        
        const svgCoordsX = centerX / this.viewportTransform.scale - this.viewportTransform.translateX;
        const svgCoordsY = centerY / this.viewportTransform.scale - this.viewportTransform.translateY;
        
        const newScale = Math.min(2.5, this.viewportTransform.scale * 1.2);
        
        this.viewportTransform.translateX = -(svgCoordsX * newScale - centerX) / newScale;
        this.viewportTransform.translateY = -(svgCoordsY * newScale - centerY) / newScale;
        this.viewportTransform.scale = newScale;
        
        this.updateViewportTransform();
      });
      
      // Zoom out button
      this.createZoomButton(zoomGroup, 40, 70, "−", () => {
        // Scale from center of view
        const svgRect = this.svg.getBoundingClientRect();
        const centerX = svgRect.width / 2;
        const centerY = svgRect.height / 2;
        
        const svgCoordsX = centerX / this.viewportTransform.scale - this.viewportTransform.translateX;
        const svgCoordsY = centerY / this.viewportTransform.scale - this.viewportTransform.translateY;
        
        const newScale = Math.max(0.25, this.viewportTransform.scale / 1.2);
        
        this.viewportTransform.translateX = -(svgCoordsX * newScale - centerX) / newScale;
        this.viewportTransform.translateY = -(svgCoordsY * newScale - centerY) / newScale;
        this.viewportTransform.scale = newScale;
        
        this.updateViewportTransform();
      });
      
      // Reset view button
      this.createZoomButton(zoomGroup, 40, 110, "↺", () => {
        this.resetView();
      });
      
      this.svg.appendChild(zoomGroup);
    }
  }
  
  createZoomButton(parent, x, y, label, clickHandler) {
    const button = document.createElementNS("http://www.w3.org/2000/svg", "g");
    button.setAttribute("transform", `translate(${x}, ${y})`);
    button.style.cursor = "pointer";
    
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("r", 15);
    circle.setAttribute("fill", "#f8f9fa");
    circle.setAttribute("stroke", "#dee2e6");
    
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "central");
    text.setAttribute("font-size", "18px");
    text.setAttribute("font-weight", "bold");
    text.setAttribute("fill", "#495057");
    text.textContent = label;
    
    button.appendChild(circle);
    button.appendChild(text);
    button.addEventListener("click", clickHandler);
    
    parent.appendChild(button);
    return button;
  }
  
  addDragIndicator() {
    // Only add drag indicator in modal view
    if (this.container && this.container.id === 'modal-cluster-diagram') {
      const dragIndicator = document.createElementNS("http://www.w3.org/2000/svg", "g");
      dragIndicator.setAttribute("transform", `translate(${this.width - 40}, ${70})`);
      dragIndicator.setAttribute("class", "drag-indicator");
      
      // Create indicator background
      const indicatorBg = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      indicatorBg.setAttribute("r", 16);
      indicatorBg.setAttribute("fill", "white");
      indicatorBg.setAttribute("stroke", "#e0e0e0");
      indicatorBg.setAttribute("opacity", "0.8");
      
      // Create hand icon
      const handIcon = document.createElementNS("http://www.w3.org/2000/svg", "path");
      handIcon.setAttribute("d", "M-5,0 C-5,-2 -3,-4 -1,-4 C1,-4 2,-2 2,0 L2,-8 C2,-10 4,-12 6,-12 C8,-12 10,-10 10,-8 L10,-8 C10,-10 12,-12 14,-12 C15,-12 16,-11 16,-10 L16,-8 C16,-10 18,-12 20,-12 C23,-12 24,-10 24,-8 L24,4 C24,8 22,10 16,10 L0,10 C-4,10 -6,8 -6,4 Z");
      handIcon.setAttribute("fill", "#6c757d");
      handIcon.setAttribute("transform", "scale(0.5)");
      
      // Add animation to indicate draggability
      const animateTransform = document.createElementNS("http://www.w3.org/2000/svg", "animateTransform");
      animateTransform.setAttribute("attributeName", "transform");
      animateTransform.setAttribute("type", "translate");
      animateTransform.setAttribute("values", "0,0; 2,0; -2,0; 0,0");
      animateTransform.setAttribute("dur", "2s");
      animateTransform.setAttribute("repeatCount", "indefinite");
      handIcon.appendChild(animateTransform);
      
      // Create text label
      const textLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
      textLabel.setAttribute("x", 0);
      textLabel.setAttribute("y", 30);
      textLabel.setAttribute("text-anchor", "middle");
      textLabel.setAttribute("fill", "#6c757d");
      textLabel.setAttribute("font-size", "10px");
      textLabel.textContent = "Drag to Pan";
      
      dragIndicator.appendChild(indicatorBg);
      dragIndicator.appendChild(handIcon);
      dragIndicator.appendChild(textLabel);
      
      // Hide indicator after a few seconds
      setTimeout(() => {
        dragIndicator.style.opacity = "0";
        dragIndicator.style.transition = "opacity 1s";
        
        // Show it briefly when hovering over the diagram
        this.svg.addEventListener("mouseenter", () => {
          dragIndicator.style.opacity = "1";
          setTimeout(() => {
            dragIndicator.style.opacity = "0";
          }, 2000);
        });
      }, 5000);
      
      this.svg.appendChild(dragIndicator);
    }
  }
  
  setupTooltipListeners() {
    // Global handlers for tooltip
    this.svg.addEventListener('mouseover', (e) => {
      const target = e.target.closest('.node');
      if (target && target.hasAttribute('data-tooltip')) {
        this.showTooltip(e, target.getAttribute('data-tooltip'));
      }
    });
    
    this.svg.addEventListener('mousemove', (e) => {
      if (this.tooltip.style.display === 'block') {
        this.positionTooltip(e);
      }
    });
    
    this.svg.addEventListener('mouseout', (e) => {
      const target = e.target.closest('.node');
      if (target) {
        this.hideTooltip();
      }
    });
  }
  
  showTooltip(e, content) {
    this.tooltip.innerHTML = content;
    this.tooltip.style.display = 'block';
    this.positionTooltip(e);
  }
  
  positionTooltip(e) {
    const x = e.clientX + 10;
    const y = e.clientY + 10;
    
    // Position the tooltip and ensure it stays within viewport
    this.tooltip.style.left = `${x}px`;
    this.tooltip.style.top = `${y}px`;
    
    // Check if tooltip goes beyond the window width
    const tooltipRect = this.tooltip.getBoundingClientRect();
    if (tooltipRect.right > window.innerWidth) {
      this.tooltip.style.left = `${window.innerWidth - tooltipRect.width - 10}px`;
    }
    
    // Check if tooltip goes beyond the window height
    if (tooltipRect.bottom > window.innerHeight) {
      this.tooltip.style.top = `${y - tooltipRect.height - 10}px`;
    }
  }
  
  hideTooltip() {
    this.tooltip.style.display = 'none';
  }
  
  // Removed view type filtering as requested
  
  updateMonitoringConnections() {
    this.monitoringConnections.forEach(conn => {
      // Set visibility based on monitoring toggle state
      conn.style.display = this.showMonitoringOverlay ? '' : 'none';
    });
    
    // Also update any traffic dots that belong to monitoring connections
    const trafficDots = this.connectionsGroup.querySelectorAll('.traffic-dot');
    trafficDots.forEach(dot => {
      if (dot.parentElement && dot.parentElement.classList.contains('monitoring-connection')) {
        dot.style.display = this.showMonitoringOverlay ? '' : 'none';
      }
    });
  }
  
  addFullscreenToggle() {
    // Removed fullscreen toggle inside diagram as we're using the green expand button
  }
  
  toggleFullscreen() {
    this.fullscreen = !this.fullscreen;
    
    if (this.fullscreen) {
      // Save original dimensions and position
      this.originalContainerStyle = {
        position: this.container.style.position,
        zIndex: this.container.style.zIndex,
        top: this.container.style.top,
        left: this.container.style.left,
        width: this.container.style.width,
        height: this.container.style.height
      };
      
      // Set fullscreen
      this.container.style.position = "fixed";
      this.container.style.zIndex = "1000";
      this.container.style.top = "0";
      this.container.style.left = "0";
      this.container.style.width = "100%";
      this.container.style.height = "100%";
      this.container.style.background = "#f8f9fa";
      
      // Get new dimensions
      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight;
      
      // Update internal dimensions
      this.width = newWidth;
      this.height = newHeight;
      
      // Update SVG attributes
      this.svg.setAttribute("width", "100%");
      this.svg.setAttribute("height", "100%");
      
      // Reset the viewport transformation to ensure all content is visible
      this.resetView();
      
      // Full redraw with new dimensions
      this.update();
      
      // After updating, ensure we can see all content
      setTimeout(() => {
        const bbox = this.mainGroup.getBBox();
        const padding = 50;
        
        // Calculate scale to fit entire diagram with padding
        const scaleX = this.width / (bbox.width + padding * 2);
        const scaleY = this.height / (bbox.height + padding * 2);
        const scale = Math.min(scaleX, scaleY, 1);
        
        // Center the diagram
        const centerX = (this.width - bbox.width * scale) / 2 - bbox.x * scale;
        const centerY = (this.height - bbox.height * scale) / 2 - bbox.y * scale;
        
        this.viewportTransform = {
          scale: scale,
          translateX: centerX / scale,
          translateY: centerY / scale
        };
        
        this.updateViewportTransform();
      }, 100);
    } else {
      // Restore original dimensions
      this.container.style.position = this.originalContainerStyle.position;
      this.container.style.zIndex = this.originalContainerStyle.zIndex;
      this.container.style.top = this.originalContainerStyle.top;
      this.container.style.left = this.originalContainerStyle.left;
      this.container.style.width = this.originalContainerStyle.width;
      this.container.style.height = this.originalContainerStyle.height;
      
      // Get original container dimensions
      const rect = this.container.getBoundingClientRect();
      this.width = rect.width;
      this.height = rect.height;
      
      // Update SVG attributes
      this.svg.setAttribute("width", "100%");
      this.svg.setAttribute("height", "100%");
      
      // Reset view
      this.resetView();
      
      // Redraw diagram
      this.update();
      
      // After updating, ensure we can see all content
      setTimeout(() => {
        const bbox = this.mainGroup.getBBox();
        const padding = 30;
        
        // Calculate scale to fit entire diagram with padding
        const scaleX = this.width / (bbox.width + padding * 2);
        const scaleY = this.height / (bbox.height + padding * 2);
        const scale = Math.min(scaleX, scaleY, 1);
        
        // Center the diagram
        const centerX = (this.width - bbox.width * scale) / 2 - bbox.x * scale;
        const centerY = (this.height - bbox.height * scale) / 2 - bbox.y * scale;
        
        this.viewportTransform = {
          scale: scale,
          translateX: centerX / scale,
          translateY: centerY / scale
        };
        
        this.updateViewportTransform();
      }, 100);
    }
  }
  
  createDataFlowControls() {
    const dataFlowPanel = document.createElementNS("http://www.w3.org/2000/svg", "g");
    dataFlowPanel.setAttribute("transform", `translate(${this.width - 280}, 50)`);
    
    const panelBg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    panelBg.setAttribute("x", 0);
    panelBg.setAttribute("y", 0);
    panelBg.setAttribute("width", 250);
    panelBg.setAttribute("height", 120);
    panelBg.setAttribute("rx", 8);
    panelBg.setAttribute("fill", "white");
    panelBg.setAttribute("stroke", "#e0e0e0");
    panelBg.setAttribute("fill-opacity", "0.9");
    
    const panelTitle = document.createElementNS("http://www.w3.org/2000/svg", "text");
    panelTitle.setAttribute("x", 15);
    panelTitle.setAttribute("y", 25);
    panelTitle.setAttribute("font-weight", "600");
    panelTitle.setAttribute("font-size", "14px");
    panelTitle.textContent = "Data Flow Visualization";
    
    dataFlowPanel.appendChild(panelBg);
    dataFlowPanel.appendChild(panelTitle);
    
    // Data flow toggles
    const flowTypes = [
      { id: "ingestion", label: "Data Ingestion", color: this.colors.ingestionFlow, y: 50 },
      { id: "search", label: "Search Queries", color: this.colors.searchFlow, y: 75 },
      { id: "archiving", label: "Data Archiving", color: this.colors.archivingFlow, y: 100 }
    ];
    
    // Create toggle for each flow type
    flowTypes.forEach(flow => {
      const toggleGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
      toggleGroup.setAttribute("transform", `translate(15, ${flow.y})`);
      toggleGroup.setAttribute("class", "flow-toggle");
      toggleGroup.setAttribute("data-flow", flow.id);
      
      // Toggle switch background
      const switchBg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      switchBg.setAttribute("x", 0);
      switchBg.setAttribute("y", -10);
      switchBg.setAttribute("width", 30);
      switchBg.setAttribute("height", 16);
      switchBg.setAttribute("rx", 8);
      switchBg.setAttribute("fill", "#e9ecef");
      switchBg.setAttribute("stroke", "#ced4da");
      
      // Toggle switch handle
      const switchHandle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      switchHandle.setAttribute("cx", 7);
      switchHandle.setAttribute("cy", -2);
      switchHandle.setAttribute("r", 6);
      switchHandle.setAttribute("fill", "#ffffff");
      switchHandle.setAttribute("stroke", "#ced4da");
      
      // Toggle label
      const toggleLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
      toggleLabel.setAttribute("x", 40);
      toggleLabel.setAttribute("y", 0);
      toggleLabel.setAttribute("font-size", "12px");
      toggleLabel.textContent = flow.label;
      
      // Color indicator
      const colorIndicator = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      colorIndicator.setAttribute("cx", 160);
      colorIndicator.setAttribute("cy", -2);
      colorIndicator.setAttribute("r", 5);
      colorIndicator.setAttribute("fill", flow.color);
      
      toggleGroup.appendChild(switchBg);
      toggleGroup.appendChild(switchHandle);
      toggleGroup.appendChild(toggleLabel);
      toggleGroup.appendChild(colorIndicator);
      
      // Toggle state
      toggleGroup.flowActive = false;
      
      // Add click handler
      toggleGroup.style.cursor = "pointer";
      toggleGroup.addEventListener("click", () => {
        toggleGroup.flowActive = !toggleGroup.flowActive;
        
        if (toggleGroup.flowActive) {
          switchBg.setAttribute("fill", flow.color);
          switchHandle.setAttribute("cx", 23);
          this.showDataFlow(flow.id);
        } else {
          switchBg.setAttribute("fill", "#e9ecef");
          switchHandle.setAttribute("cx", 7);
          this.hideDataFlow(flow.id);
        }
      });
      
      dataFlowPanel.appendChild(toggleGroup);
    });
    
    this.dataFlowPanel = dataFlowPanel;
    this.mainGroup.appendChild(dataFlowPanel);
  }
  
  showDataFlow(flowType) {
    // Clear existing flow paths
    this.clearDataFlowPaths(flowType);
    
    // Create appropriate data flow paths based on flow type
    switch(flowType) {
      case "ingestion":
        this.createIngestionFlows();
        break;
      case "search":
        this.createSearchFlows();
        break;
      case "archiving":
        this.createArchivingFlows();
        break;
    }
  }
  
  hideDataFlow(flowType) {
    this.clearDataFlowPaths(flowType);
  }
  
  clearDataFlowPaths(flowType) {
    const paths = this.connectionsGroup.querySelectorAll(`.${flowType}-flow`);
    paths.forEach(path => path.remove());
  }
  
  createIngestionFlows() {
    // Get the helper node and hot nodes for the flow 
    const helperNode = this.nodesGroup.querySelector('.helper-node');
    const hotNode = this.nodesGroup.querySelector('.hot-node');
    
    if (!helperNode || !hotNode) return;
    
    // Create an external data source icon
    const sourceTx = 80; 
    const sourceTy = 50;
    const sourceGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    sourceGroup.setAttribute("class", "data-source ingestion-flow");
    sourceGroup.setAttribute("transform", `translate(${sourceTx}, ${sourceTy})`);
    
    // Source icon 
    const sourceIcon = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const sourceRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    sourceRect.setAttribute("x", -20);
    sourceRect.setAttribute("y", -15);
    sourceRect.setAttribute("width", 40);
    sourceRect.setAttribute("height", 30);
    sourceRect.setAttribute("rx", 5);
    sourceRect.setAttribute("fill", this.colors.ingestionFlow);
    sourceIcon.appendChild(sourceRect);
    
    // Add DB icon inside
    const icons = document.createElementNS("http://www.w3.org/2000/svg", "path");
    icons.setAttribute("d", "M-10,-5 H10 M-10,0 H10 M-10,5 H10");
    icons.setAttribute("stroke", "white");
    icons.setAttribute("stroke-width", "2");
    icons.setAttribute("fill", "none");
    sourceIcon.appendChild(icons);
    
    // Add text label
    const sourceText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    sourceText.setAttribute("x", 0);
    sourceText.setAttribute("y", 30);
    sourceText.setAttribute("text-anchor", "middle");
    sourceText.setAttribute("font-size", "10px");
    sourceText.setAttribute("fill", "#333");
    sourceText.textContent = "Data Sources";
    
    sourceGroup.appendChild(sourceIcon);
    sourceGroup.appendChild(sourceText);
    this.connectionsGroup.appendChild(sourceGroup);
    
    // Now create the flows
    // Source to Helper (Beats/Logstash)
    this.createDataFlowPath(
      sourceTx, sourceTy, 
      parseFloat(helperNode.getAttribute("transform").split(',')[0].split('(')[1]),
      parseFloat(helperNode.getAttribute("transform").split(',')[1]),
      "ingestion"
    );
    
    // Helper to Hot nodes
    this.createDataFlowPath(
      parseFloat(helperNode.getAttribute("transform").split(',')[0].split('(')[1]),
      parseFloat(helperNode.getAttribute("transform").split(',')[1]),
      parseFloat(hotNode.getAttribute("transform").split(',')[0].split('(')[1]),
      parseFloat(hotNode.getAttribute("transform").split(',')[1]),
      "ingestion"
    );
  }
  
  createSearchFlows() {
    // Create search client icon
    const clientTx = 80;
    const clientTy = 120;
    const clientGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    clientGroup.setAttribute("class", "search-client search-flow");
    clientGroup.setAttribute("transform", `translate(${clientTx}, ${clientTy})`);
    
    // Client icon 
    const clientIcon = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const clientRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    clientRect.setAttribute("x", -20);
    clientRect.setAttribute("y", -15);
    clientRect.setAttribute("width", 40);
    clientRect.setAttribute("height", 30);
    clientRect.setAttribute("rx", 5);
    clientRect.setAttribute("fill", this.colors.searchFlow);
    clientIcon.appendChild(clientRect);
    
    // Add magnifying glass icon
    const searchIcon = document.createElementNS("http://www.w3.org/2000/svg", "path");
    searchIcon.setAttribute("d", "M-5,0 A7,7 0 1,1 0,7 A7,7 0 1,1 -5,0 M0,7 L7,13");
    searchIcon.setAttribute("stroke", "white");
    searchIcon.setAttribute("stroke-width", "2");
    searchIcon.setAttribute("fill", "none");
    clientIcon.appendChild(searchIcon);
    
    // Add text label
    const clientText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    clientText.setAttribute("x", 0);
    clientText.setAttribute("y", 30);
    clientText.setAttribute("text-anchor", "middle");
    clientText.setAttribute("font-size", "10px");
    clientText.setAttribute("fill", "#333");
    clientText.textContent = "Search Clients";
    
    clientGroup.appendChild(clientIcon);
    clientGroup.appendChild(clientText);
    this.connectionsGroup.appendChild(clientGroup);
    
    // Get nodes for search flows
    const helperNode = this.nodesGroup.querySelector('.helper-node');
    const masterNode = this.nodesGroup.querySelector('.master-node');
    const hotNode = this.nodesGroup.querySelector('.hot-node');
    const frozenNode = this.nodesGroup.querySelector('.frozen-node');
    
    // Client to Helper (Kibana)
    if (helperNode) {
      this.createDataFlowPath(
        clientTx, clientTy,
        parseFloat(helperNode.getAttribute("transform").split(',')[0].split('(')[1]),
        parseFloat(helperNode.getAttribute("transform").split(',')[1]),
        "search"
      );
    }
    
    // Helper to Master (search coordination)
    if (helperNode && masterNode) {
      this.createDataFlowPath(
        parseFloat(helperNode.getAttribute("transform").split(',')[0].split('(')[1]),
        parseFloat(helperNode.getAttribute("transform").split(',')[1]),
        parseFloat(masterNode.getAttribute("transform").split(',')[0].split('(')[1]),
        parseFloat(masterNode.getAttribute("transform").split(',')[1]),
        "search"
      );
    }
    
    // Master to Hot and Frozen (if exists)
    if (masterNode) {
      if (hotNode) {
        this.createDataFlowPath(
          parseFloat(masterNode.getAttribute("transform").split(',')[0].split('(')[1]),
          parseFloat(masterNode.getAttribute("transform").split(',')[1]),
          parseFloat(hotNode.getAttribute("transform").split(',')[0].split('(')[1]),
          parseFloat(hotNode.getAttribute("transform").split(',')[1]),
          "search"
        );
      }
      
      if (frozenNode) {
        this.createDataFlowPath(
          parseFloat(masterNode.getAttribute("transform").split(',')[0].split('(')[1]),
          parseFloat(masterNode.getAttribute("transform").split(',')[1]),
          parseFloat(frozenNode.getAttribute("transform").split(',')[0].split('(')[1]),
          parseFloat(frozenNode.getAttribute("transform").split(',')[1]),
          "search"
        );
      }
    }
  }
  
  createArchivingFlows() {
    // Get nodes for archiving flows
    const hotNode = this.nodesGroup.querySelector('.hot-node');
    const frozenNode = this.nodesGroup.querySelector('.frozen-node');
    
    if (!hotNode || !frozenNode) return;
    
    // Hot to Frozen data archiving flow
    this.createDataFlowPath(
      parseFloat(hotNode.getAttribute("transform").split(',')[0].split('(')[1]),
      parseFloat(hotNode.getAttribute("transform").split(',')[1]),
      parseFloat(frozenNode.getAttribute("transform").split(',')[0].split('(')[1]),
      parseFloat(frozenNode.getAttribute("transform").split(',')[1]),
      "archiving"
    );
    
    // Add storage icon 
    const storageTx = this.width - 80;
    const storageTy = parseFloat(frozenNode.getAttribute("transform").split(',')[1]) + 80;
    const storageGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    storageGroup.setAttribute("class", "cold-storage archiving-flow");
    storageGroup.setAttribute("transform", `translate(${storageTx}, ${storageTy})`);
    
    // Storage icon 
    const storageIcon = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const storageRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    storageRect.setAttribute("x", -25);
    storageRect.setAttribute("y", -20);
    storageRect.setAttribute("width", 50);
    storageRect.setAttribute("height", 35);
    storageRect.setAttribute("rx", 5);
    storageRect.setAttribute("fill", this.colors.archivingFlow);
    storageIcon.appendChild(storageRect);
    
    // Add storage icon details
    const storageIconDetails = document.createElementNS("http://www.w3.org/2000/svg", "path");
    storageIconDetails.setAttribute("d", "M-15,-10 H15 M-15,0 H15 M-15,10 H15");
    storageIconDetails.setAttribute("stroke", "white");
    storageIconDetails.setAttribute("stroke-width", "2");
    storageIconDetails.setAttribute("fill", "none");
    storageIcon.appendChild(storageIconDetails);
    
    // Add text label
    const storageText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    storageText.setAttribute("x", 0);
    storageText.setAttribute("y", 30);
    storageText.setAttribute("text-anchor", "middle");
    storageText.setAttribute("font-size", "10px");
    storageText.setAttribute("fill", "#333");
    storageText.textContent = "Long-term Storage";
    
    storageGroup.appendChild(storageIcon);
    storageGroup.appendChild(storageText);
    this.connectionsGroup.appendChild(storageGroup);
    
    // Frozen to Storage
    this.createDataFlowPath(
      parseFloat(frozenNode.getAttribute("transform").split(',')[0].split('(')[1]),
      parseFloat(frozenNode.getAttribute("transform").split(',')[1]),
      storageTx, storageTy,
      "archiving"
    );
  }
  
  createDataFlowPath(x1, y1, x2, y2, flowType) {
    // Get color based on flow type
    let color;
    switch(flowType) {
      case "ingestion":
        color = this.colors.ingestionFlow;
        break;
      case "search":
        color = this.colors.searchFlow;
        break;
      case "archiving":
        color = this.colors.archivingFlow;
        break;
      default:
        color = "#9e9e9e";
    }
    
    // Find the nodes these coordinates belong to
    const fromNode = this.findNodeByCoordinates(x1, y1);
    const toNode = this.findNodeByCoordinates(x2, y2);
    
    // If we have both nodes, use their box coordinates to create edge-to-edge paths
    let startX = x1, startY = y1, endX = x2, endY = y2;
    
    if (fromNode && toNode) {
      // Get box coordinates from the data attributes
      const fromBoxX = parseFloat(fromNode.getAttribute("data-box-x"));
      const fromBoxY = parseFloat(fromNode.getAttribute("data-box-y"));
      const fromBoxWidth = parseFloat(fromNode.getAttribute("data-box-width"));
      const fromBoxHeight = parseFloat(fromNode.getAttribute("data-box-height"));
      
      const toBoxX = parseFloat(toNode.getAttribute("data-box-x"));
      const toBoxY = parseFloat(toNode.getAttribute("data-box-y"));
      const toBoxWidth = parseFloat(toNode.getAttribute("data-box-width"));
      const toBoxHeight = parseFloat(toNode.getAttribute("data-box-height"));
      
      // Calculate connection points on the edges of the boxes instead of center
      // Determine direction of connection
      if (fromBoxY + fromBoxHeight < toBoxY) {
        // From box is above to box
        startX = fromBoxX + fromBoxWidth / 2;
        startY = fromBoxY + fromBoxHeight;
        endX = toBoxX + toBoxWidth / 2;
        endY = toBoxY;
      } else if (fromBoxY > toBoxY + toBoxHeight) {
        // From box is below to box
        startX = fromBoxX + fromBoxWidth / 2;
        startY = fromBoxY;
        endX = toBoxX + toBoxWidth / 2;
        endY = toBoxY + toBoxHeight;
      } else if (fromBoxX + fromBoxWidth < toBoxX) {
        // From box is to the left of to box
        startX = fromBoxX + fromBoxWidth;
        startY = fromBoxY + fromBoxHeight / 2;
        endX = toBoxX;
        endY = toBoxY + toBoxHeight / 2;
      } else {
        // From box is to the right of to box
        startX = fromBoxX;
        startY = fromBoxY + fromBoxHeight / 2;
        endX = toBoxX + toBoxWidth;
        endY = toBoxY + toBoxHeight / 2;
      }
    }
    
    // Calculate control points for curved path
    const dx = endX - startX;
    const dy = endY - startY;
    const offset = Math.min(80, Math.abs(dx) * 0.4);
    let cp1x, cp1y, cp2x, cp2y;
    
    if (Math.abs(dx) > Math.abs(dy)) {
      cp1x = startX + Math.sign(dx) * offset;
      cp1y = startY;
      cp2x = endX - Math.sign(dx) * offset;
      cp2y = endY;
    } else {
      cp1x = startX;
      cp1y = startY + Math.sign(dy) * offset;
      cp2x = endX;
      cp2y = endY - Math.sign(dy) * offset;
    }
    
    // Create path
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", `M${startX},${startY} C${cp1x},${cp1y} ${cp2x},${cp2y} ${endX},${endY}`);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", color);
    path.setAttribute("stroke-width", "2");
    path.setAttribute("class", `${flowType}-flow`);
    path.setAttribute("marker-end", `url(#${flowType}-arrow)`);
    
    // Add animation for data flow
    const flowDot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    flowDot.setAttribute("r", "3");
    flowDot.setAttribute("fill", color);
    flowDot.setAttribute("class", `traffic-dot ${flowType}-flow`);
    
    const animateMotion = document.createElementNS("http://www.w3.org/2000/svg", "animateMotion");
    animateMotion.setAttribute("dur", "2s");
    animateMotion.setAttribute("repeatCount", "indefinite");
    animateMotion.setAttribute("path", path.getAttribute("d"));
    
    flowDot.appendChild(animateMotion);
    
    this.connectionsGroup.appendChild(path);
    this.connectionsGroup.appendChild(flowDot);
    
    return path;
  }
  
  // Helper method to find a node by coordinates
  findNodeByCoordinates(x, y) {
    const nodes = this.nodesGroup.querySelectorAll('.node');
    for (const node of nodes) {
      const nodeX = parseFloat(node.getAttribute("transform").split(',')[0].split('(')[1]);
      const nodeY = parseFloat(node.getAttribute("transform").split(',')[1]);
      
      // Check if coordinates are close to this node's position
      if (Math.abs(nodeX - x) < 10 && Math.abs(nodeY - y) < 10) {
        return node;
      }
    }
    return null;
  }
  
  update() {
    // Clear previous nodes, boxes and connections
    while (this.nodesGroup.firstChild) {
      this.nodesGroup.removeChild(this.nodesGroup.firstChild);
    }
    while (this.boxesGroup.firstChild) {
      this.boxesGroup.removeChild(this.boxesGroup.firstChild);
    }
    
    // Preserve data flow controls but clear other connections
    const flowControls = Array.from(this.connectionsGroup.children)
      .filter(el => !el.classList.contains('ingestion-flow') && 
               !el.classList.contains('search-flow') && 
               !el.classList.contains('archiving-flow'));
    
    while (this.connectionsGroup.firstChild) {
      this.connectionsGroup.removeChild(this.connectionsGroup.firstChild);
    }
    
    // Add back non-flow elements
    flowControls.forEach(el => this.connectionsGroup.appendChild(el));
    
    this.connections = [];
    this.monitoringConnections = [];
    
    // Get current values from form fields
    const masterCount = 3; // Always 3 for high availability
    const masterInstanceType = this.formFields.masterInstanceType ? 
      this.formFields.masterInstanceType.options[this.formFields.masterInstanceType.selectedIndex].text : 
      "m6i.xlarge";
    
    const hotNodeCount = parseInt(this.formFields.hotNodeCount ? this.formFields.hotNodeCount.value : 7);
    const hotInstanceType = this.formFields.hotInstanceType ? 
      this.formFields.hotInstanceType.options[this.formFields.hotInstanceType.selectedIndex].text : 
      "c6i.xlarge";
    
    const mlNodeCount = parseInt(this.formFields.mlNodeCount ? this.formFields.mlNodeCount.value : 2);
    const mlInstanceType = this.formFields.mlInstanceType ? 
      this.formFields.mlInstanceType.options[this.formFields.mlInstanceType.selectedIndex].text : 
      "m6i.2xlarge";
    
    const frozenNodeCount = parseInt(this.formFields.frozenNodeCount ? this.formFields.frozenNodeCount.value : 3);
    const frozenInstanceType = this.formFields.frozenInstanceType ? 
      this.formFields.frozenInstanceType.options[this.formFields.frozenInstanceType.selectedIndex].text : 
      "i3.2xlarge";
    
    // Calculate dimensions and spacing
    const radius = 25;
    
    // Use more of the canvas width and height
    const centerX = this.width / 2;
    const spacing = {
      horizontal: this.width * 0.12,
      vertical: this.height * 0.14
    };
    
    // Configure box dimensions based on node count
    const boxWidth = {
      helper: 220,
      master: 240,
      hot: Math.min(360, Math.max(300, hotNodeCount * 40)),
      ml: 220,
      frozen: 220
    };
    
    const bannerHeight = 28;
    const boxPadding = 30;
    
    // Calculate box heights based on node count and allowing room for node visualization
    const calculateBoxHeight = (nodeCount) => {
      const baseHeight = 140;
      const rowHeight = 60;
      const rows = Math.ceil(Math.min(nodeCount, 5) / 3);
      return baseHeight + (rows > 1 ? (rows - 1) * rowHeight : 0);
    };
    
    const boxHeight = {
      helper: calculateBoxHeight(1),
      master: calculateBoxHeight(masterCount),
      hot: calculateBoxHeight(hotNodeCount),
      ml: calculateBoxHeight(mlNodeCount),
      frozen: calculateBoxHeight(frozenNodeCount)
    };
    
    // Calculate positions for a more balanced layout
    
    // Start with the helper node at the left for the ingress path
    const helperBoxWidth = boxWidth.helper;
    const helperBoxHeight = boxHeight.helper;
    const helperBoxX = 80;
    const helperBoxY = this.height * 0.15;
    
    // Create helper node box
    this.createNodeBox(helperBoxX, helperBoxY, helperBoxWidth, helperBoxHeight, "helper");
    
    // Create helper node inside the box
    const helperX = helperBoxX + helperBoxWidth / 2;
    const helperY = helperBoxY + helperBoxHeight / 2;
    const helperNode = this.createNode(helperX, helperY, radius, "helper", 1, "t3.medium", 
                                     helperBoxX, helperBoxY, helperBoxWidth, helperBoxHeight);
    
    // Position master nodes across from helper, creating a gateway
    const masterBoxWidth = boxWidth.master;
    const masterBoxHeight = boxHeight.master;
    // Position master node box to the right of helper
    const masterBoxX = centerX - (masterBoxWidth / 2);
    const masterBoxY = helperBoxY;
    
    // Create master node box
    this.createNodeBox(masterBoxX, masterBoxY, masterBoxWidth, masterBoxHeight, "master");
    
    // Create master nodes inside the box
    const masterX = masterBoxX + masterBoxWidth / 2;
    const masterY = masterBoxY + masterBoxHeight / 2;
    const masterNode = this.createNode(masterX, masterY, radius, "master", masterCount, masterInstanceType, 
                                    masterBoxX, masterBoxY, masterBoxWidth, masterBoxHeight);
    
    // Position hot nodes below master nodes as the central processing unit
    const hotBoxWidth = boxWidth.hot;
    const hotBoxHeight = boxHeight.hot;
    const hotBoxX = centerX - hotBoxWidth / 2;
    const hotBoxY = masterBoxY + masterBoxHeight + spacing.vertical;
    
    // Create hot node box
    this.createNodeBox(hotBoxX, hotBoxY, hotBoxWidth, hotBoxHeight, "hot");
    
    // Create hot nodes inside the box
    const hotX = hotBoxX + hotBoxWidth / 2;
    const hotY = hotBoxY + hotBoxHeight / 2;
    const hotNode = this.createNode(hotX, hotY, radius, "hot", hotNodeCount, hotInstanceType,
                             hotBoxX, hotBoxY, hotBoxWidth, hotBoxHeight);
    
    // Calculate positions for ML and Frozen nodes in third tier as branches
    const thirdTierY = hotBoxY + hotBoxHeight + spacing.vertical;
    
    // Create ML nodes box to the left if any exist
    let mlNode = null;
    if (mlNodeCount > 0) {
      const mlBoxWidth = boxWidth.ml;
      const mlBoxHeight = boxHeight.ml;
      // Position ML node box to align with left of hot nodes
      const mlBoxX = hotBoxX - (spacing.horizontal / 2);
      const mlBoxY = thirdTierY;
      
      // Create ML node box
      this.createNodeBox(mlBoxX, mlBoxY, mlBoxWidth, mlBoxHeight, "ml");
      
      // Create ML nodes inside the box
      const mlX = mlBoxX + mlBoxWidth / 2;
      const mlY = mlBoxY + mlBoxHeight / 2;
      mlNode = this.createNode(mlX, mlY, radius, "ml", mlNodeCount, mlInstanceType,
                          mlBoxX, mlBoxY, mlBoxWidth, mlBoxHeight);
    }
    
    // Create frozen nodes box to the right if any exist
    let frozenNode = null;
    if (frozenNodeCount > 0) {
      const frozenBoxWidth = boxWidth.frozen;
      const frozenBoxHeight = boxHeight.frozen;
      // Position frozen node box to align with right of hot nodes
      const frozenBoxX = hotBoxX + hotBoxWidth - frozenBoxWidth + (spacing.horizontal / 2);
      const frozenBoxY = thirdTierY;
      
      // Create frozen node box
      this.createNodeBox(frozenBoxX, frozenBoxY, frozenBoxWidth, frozenBoxHeight, "frozen");
      
      // Create frozen nodes inside the box
      const frozenX = frozenBoxX + frozenBoxWidth / 2;
      const frozenY = frozenBoxY + frozenBoxHeight / 2;
      frozenNode = this.createNode(frozenX, frozenY, radius, "frozen", frozenNodeCount, frozenInstanceType,
                              frozenBoxX, frozenBoxY, frozenBoxWidth, frozenBoxHeight);
    }
    
    // Create core connections
    
    // Helper to Master (cluster management)
    this.createConnection(helperNode, masterNode);
    
    // Master to Hot (cluster connection)
    this.createConnection(masterNode, hotNode);
    
    // Hot to ML and Frozen if they exist
    if (mlNode) {
      this.createConnection(hotNode, mlNode);
    }
    
    if (frozenNode) {
      this.createConnection(hotNode, frozenNode);
    }
    
    // Create data connections
    this.createConnection(helperNode, hotNode, "data");
    
    // Create monitoring connections
    if (mlNode) {
      this.createConnection(mlNode, helperNode, "monitoring");
    }
    
    if (frozenNode) {
      this.createConnection(frozenNode, helperNode, "monitoring");
    }
    
    this.createConnection(hotNode, helperNode, "monitoring");
    this.createConnection(masterNode, helperNode, "monitoring");
    
    // Initialize the data flow controls if not already initialized
    if (!this.dataFlowsInitialized) {
      this.createDataFlowControls();
      this.dataFlowsInitialized = true;
    }
  }
}

// Utility methods for color manipulation
NodeDiagram.prototype.lightenColor = function(color, percent) {
  // Convert hex to RGB
  let r, g, b;
  if (color.startsWith('#')) {
    // Hex color
    r = parseInt(color.substr(1, 2), 16);
    g = parseInt(color.substr(3, 2), 16);
    b = parseInt(color.substr(5, 2), 16);
  } else if (color.startsWith('rgb')) {
    // RGB color
    const rgbValues = color.match(/\d+/g);
    r = parseInt(rgbValues[0]);
    g = parseInt(rgbValues[1]);
    b = parseInt(rgbValues[2]);
  } else {
    return color; // Return original if format not recognized
  }
  
  // Lighten
  r = Math.min(255, Math.floor(r * (100 + percent) / 100));
  g = Math.min(255, Math.floor(g * (100 + percent) / 100));
  b = Math.min(255, Math.floor(b * (100 + percent) / 100));
  
  return `rgb(${r}, ${g}, ${b})`;
};

NodeDiagram.prototype.darkenColor = function(color, percent) {
  // Convert hex to RGB
  let r, g, b;
  if (color.startsWith('#')) {
    // Hex color
    r = parseInt(color.substr(1, 2), 16);
    g = parseInt(color.substr(3, 2), 16);
    b = parseInt(color.substr(5, 2), 16);
  } else if (color.startsWith('rgb')) {
    // RGB color
    const rgbValues = color.match(/\d+/g);
    r = parseInt(rgbValues[0]);
    g = parseInt(rgbValues[1]);
    b = parseInt(rgbValues[2]);
  } else {
    return color; // Return original if format not recognized
  }
  
  // Darken
  r = Math.max(0, Math.floor(r * (100 - percent) / 100));
  g = Math.max(0, Math.floor(g * (100 - percent) / 100));
  b = Math.max(0, Math.floor(b * (100 - percent) / 100));
  
  return `rgb(${r}, ${g}, ${b})`;
};

// Helper to estimate memory based on instance type
NodeDiagram.prototype.getMemoryForInstanceType = function(instanceType) {
  if (!instanceType) return "Unknown";
  
  if (instanceType.includes('xlarge')) {
    if (instanceType.includes('.2xlarge')) return "16 GiB";
    if (instanceType.includes('.4xlarge')) return "32 GiB";
    if (instanceType.includes('.8xlarge')) return "64 GiB";
    if (instanceType.includes('.16xlarge')) return "128 GiB";
    if (instanceType.includes('.12xlarge')) return "96 GiB";
    return "8 GiB"; // Regular xlarge
  }
  
  if (instanceType.includes('large')) {
    return "4 GiB"; // Regular large
  }
  
  if (instanceType.includes('medium')) {
    return "4 GiB";
  }
  
  return "Unknown";
};

// Helper to estimate CPUs based on instance type
NodeDiagram.prototype.getCPUsForInstanceType = function(instanceType) {
  if (!instanceType) return "Unknown";
  
  if (instanceType.includes('xlarge')) {
    if (instanceType.includes('.2xlarge')) return "8 vCPU";
    if (instanceType.includes('.4xlarge')) return "16 vCPU";
    if (instanceType.includes('.8xlarge')) return "32 vCPU";
    if (instanceType.includes('.16xlarge')) return "64 vCPU";
    if (instanceType.includes('.12xlarge')) return "48 vCPU";
    return "4 vCPU"; // Regular xlarge
  }
  
  if (instanceType.includes('large')) {
    return "2 vCPU"; // Regular large
  }
  
  if (instanceType.includes('medium')) {
    return "2 vCPU";
  }
  
  return "Unknown";
};

// Initialize diagrams when the DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  // Network diagram
  const networkContainer = document.getElementById('network-diagram');
  if (networkContainer) {
    const networkDiagram = new NetworkDiagram('network-diagram');
  }
  
  // Remove 2D/3D toggle functionality
  const view2dBtn = document.getElementById('view-2d');
  const view3dBtn = document.getElementById('view-3d');
  
  if (view2dBtn) view2dBtn.parentNode.removeChild(view2dBtn);
  if (view3dBtn) view3dBtn.parentNode.removeChild(view3dBtn);
  
  // Additional adjustments to make all network diagrams visible at once
  const networkVisContainers = document.querySelectorAll('#network-visualization');
  if (networkVisContainers.length > 1) {
    for (let i = 1; i < networkVisContainers.length; i++) {
      networkVisContainers[i].parentNode.removeChild(networkVisContainers[i]);
    }
  }
  
  // Node diagram
  const nodeContainer = document.getElementById('cluster-diagram');
  if (nodeContainer) {
    const nodeDiagram = new NodeDiagram('cluster-diagram');
    window.mainNodeDiagram = nodeDiagram;
  }
  
  // Set up expand diagram button functionality
  const expandBtn = document.getElementById('expand-diagram-btn');
  if (expandBtn) {
    expandBtn.addEventListener('click', function() {
      // Get the current form values before opening modal
      const formValues = collectFormValues();
      
      // Show the modal
      const diagramModal = new bootstrap.Modal(document.getElementById('diagramModal'));
      diagramModal.show();
      
      // Create diagram in modal after it's shown
      document.getElementById('diagramModal').addEventListener('shown.bs.modal', function() {
        const modalDiagramContainer = document.getElementById('modal-cluster-diagram');
        if (modalDiagramContainer) {
          // Create a new NodeDiagram instance in the modal
          const modalNodeDiagram = new NodeDiagram('modal-cluster-diagram');
          window.modalNodeDiagram = modalNodeDiagram;
          
          // Apply the same form values to ensure consistency
          applyFormValues(formValues);
        }
      }, { once: true }); // Only listen once for the first opening
    });
  }
  
  // Helper function to collect current form values
  function collectFormValues() {
    return {
      masterInstanceType: document.getElementById('instance_type_master') ? 
        document.getElementById('instance_type_master').value : null,
      hotNodeCount: document.getElementById('hot_node_count') ? 
        document.getElementById('hot_node_count').value : null,
      hotInstanceType: document.getElementById('instance_type_hot') ? 
        document.getElementById('instance_type_hot').value : null,
      mlNodeCount: document.getElementById('ml_node_count') ? 
        document.getElementById('ml_node_count').value : null,
      mlInstanceType: document.getElementById('instance_type_ml') ? 
        document.getElementById('instance_type_ml').value : null,
      frozenNodeCount: document.getElementById('frozen_node_count') ? 
        document.getElementById('frozen_node_count').value : null,
      frozenInstanceType: document.getElementById('instance_type_frozen') ? 
        document.getElementById('instance_type_frozen').value : null
    };
  }
  
  // Helper function to apply form values to both diagrams
  function applyFormValues(values) {
    // Apply values to form fields (this ensures the modal diagram gets the same data)
    for (const [key, value] of Object.entries(values)) {
      if (value !== null && document.getElementById(key)) {
        document.getElementById(key).value = value;
      }
    }
  }
  
  // Add window resize handler for responsiveness
  window.addEventListener('resize', function() {
    // Resize main diagram if it exists
    if (window.mainNodeDiagram) {
      window.mainNodeDiagram.handleResize();
    }
    
    // Resize modal diagram if modal is open
    if (window.modalNodeDiagram && document.getElementById('diagramModal').classList.contains('show')) {
      window.modalNodeDiagram.handleResize();
    }
  });
  
  // Setup tab change handlers to update diagrams
  const tabs = document.querySelectorAll('button[data-bs-toggle="tab"], .section-link');
  tabs.forEach(tab => {
    tab.addEventListener('shown.bs.tab', function(event) {
      const target = event.target.getAttribute('href') || event.target.getAttribute('data-bs-target');
      if (target === '#step2' || target === '#network') {
        const networkDiagram = new NetworkDiagram('network-diagram');
      } else if (target === '#step3' || target === '#nodes') {
        if (!window.mainNodeDiagram) {
          window.mainNodeDiagram = new NodeDiagram('cluster-diagram');
        } else {
          window.mainNodeDiagram.update();
        }
      }
    });
    
    tab.addEventListener('click', function(event) {
      const target = event.target.getAttribute('href');
      if (target === '#step2') {
        setTimeout(() => {
          const networkDiagram = new NetworkDiagram('network-diagram');
        }, 100);
      } else if (target === '#step3') {
        setTimeout(() => {
          if (!window.mainNodeDiagram) {
            window.mainNodeDiagram = new NodeDiagram('cluster-diagram');
          } else {
            window.mainNodeDiagram.update();
          }
        }, 100);
      }
    });
  });
  
  // Handle modal close - we should clean up the modal diagram
  document.getElementById('diagramModal')?.addEventListener('hidden.bs.modal', function() {
    // Clear the modal diagram reference
    window.modalNodeDiagram = null;
    
    // Clear the diagram container
    const modalDiagramContainer = document.getElementById('modal-cluster-diagram');
    if (modalDiagramContainer) {
      modalDiagramContainer.innerHTML = '';
    }
  });
});
