// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract SupplyChain is Ownable {
    enum Role { PRODUCER, DISTRIBUTOR, RETAILER }
    enum Status { CREATED, IN_TRANSIT, RECEIVED, DISTRIBUTED, DELIVERED }
    
    struct Product {
        string productId;
        string name;
        address producerId;
        uint256 price;
        uint256 quantity;
        Status status;
        string location;
    }
    
    struct TrackingUpdate {
        string productId;
        Status status;
        string location;
        address updatedBy;
        uint256 timestamp;
    }
    
    struct ActionTrack {
        string action;
        string data;
        string timestamp;
        address actor;
        Role role;
    }
    
    struct DashboardActivity {
        address user;
        Role role;
        string action;
        uint256 timestamp;
        string details;
    }
    
    struct ProductHistoryItem {
        string action;
        address actor;
        uint256 quantity;
        uint256 timestamp;
    }
    
    mapping(string => Product) public products;
    mapping(string => TrackingUpdate[]) public productHistory;
    mapping(address => ActionTrack[]) private activityHistory;
    mapping(address => Role) public userRoles;
    mapping(address => ActionTrack[]) private producerActions;
    mapping(address => ActionTrack[]) private distributorActions;
    mapping(address => ActionTrack[]) private retailerActions;
    DashboardActivity[] public allActivities;
    
    event ProductAdded(
        string productId,
        string name,
        address producer,
        uint256 price,
        uint256 quantity
    );
    
    event ProductDistributed(
        string productId,
        address distributorId,
        uint256 quantity
    );
    
    event ProductReceived(
        string productId,
        address receiver,
        uint256 quantity
    );
    
    event StatusUpdated(
        string productId,
        uint8 status,
        string location
    );
    
    event ActionTracked(
        address indexed user,
        Role indexed role,
        string action,
        string timestamp
    );
    
    event DashboardAccessed(
        address indexed user,
        Role indexed role,
        uint256 timestamp
    );
    
    event ProductPurchased(
        string productId,
        address indexed buyer,
        uint256 quantity,
        uint256 timestamp
    );
    
    modifier onlyRole(Role role) {
        require(userRoles[msg.sender] == role, "Unauthorized role");
        _;
    }
    
    constructor() Ownable(msg.sender) {}
    
    function addProduct(
        string memory _productId,
        string memory _name,
        address _producerId,
        uint256 _price,
        uint256 _quantity
    ) public onlyOwner {
        require(bytes(_productId).length > 0, "Product ID cannot be empty");
        require(bytes(_name).length > 0, "Product name cannot be empty");
        require(_price > 0, "Price must be greater than 0");
        require(_quantity > 0, "Quantity must be greater than 0");
        
        products[_productId] = Product({
            productId: _productId,
            name: _name,
            producerId: _producerId,
            price: _price,
            quantity: _quantity,
            status: Status.CREATED,
            location: ""
        });
        
        productHistory[_productId].push(TrackingUpdate({
            productId: _productId,
            status: Status.CREATED,
            location: "",
            updatedBy: msg.sender,
            timestamp: block.timestamp
        }));
        
        emit ProductAdded(_productId, _name, _producerId, _price, _quantity);
    }
    
    function updateProductStatus(
        string memory _productId,
        Status _status,
        string memory _location
    ) public {
        require(bytes(products[_productId].productId).length > 0, "Product does not exist");
        require(bytes(_location).length > 0, "Location cannot be empty");
        
        products[_productId].status = _status;
        products[_productId].location = _location;
        
        productHistory[_productId].push(TrackingUpdate({
            productId: _productId,
            status: _status,
            location: _location,
            updatedBy: msg.sender,
            timestamp: block.timestamp
        }));
        
        emit StatusUpdated(_productId, uint8(_status), _location);
    }
    
    function distributeProduct(
        string memory _productId,
        address _distributorId,
        uint256 _quantity
    ) public {
        require(bytes(products[_productId].productId).length > 0, "Product does not exist");
        require(products[_productId].quantity >= _quantity, "Insufficient quantity");
        require(_distributorId != address(0), "Invalid distributor address");
        
        products[_productId].status = Status.IN_TRANSIT;
        products[_productId].quantity -= _quantity;
        
        emit ProductDistributed(_productId, _distributorId, _quantity);
    }
    
    function receiveProduct(string memory _productId) public {
        require(bytes(products[_productId].productId).length > 0, "Product does not exist");
        require(products[_productId].status == Status.IN_TRANSIT, "Product is not in transit");
        require(msg.sender != products[_productId].producerId, "Producer cannot receive their own product");
        
        products[_productId].status = Status.RECEIVED;
        
        productHistory[_productId].push(TrackingUpdate({
            productId: _productId,
            status: Status.RECEIVED,
            location: products[_productId].location,
            updatedBy: msg.sender,
            timestamp: block.timestamp
        }));
        
        emit ProductReceived(_productId, msg.sender, products[_productId].quantity);
    }
    
    function getProductHistory(string memory _productId) 
        public 
        view 
        returns (TrackingUpdate[] memory) 
    {
        require(bytes(products[_productId].productId).length > 0, "Product does not exist");
        return productHistory[_productId];
    }
    
    function getProductDetails(string memory _productId) 
        public 
        view 
        returns (
            string memory name,
            address producerId,
            uint256 price,
            uint256 quantity,
            Status status,
            string memory location
        ) 
    {
        require(bytes(products[_productId].productId).length > 0, "Product does not exist");
        Product memory product = products[_productId];
        
        return (
            product.name,
            product.producerId,
            product.price,
            product.quantity,
            product.status,
            product.location
        );
    }
    
    function registerUser(address user, Role role) public onlyOwner {
        userRoles[user] = role;
    }
    
    function trackAction(
        string memory action,
        string memory data,
        string memory timestamp
    ) public {
        Role userRole = userRoles[msg.sender];
        
        activityHistory[msg.sender].push(ActionTrack({
            action: action,
            data: data,
            timestamp: timestamp,
            actor: msg.sender,
            role: userRole
        }));
        
        allActivities.push(DashboardActivity({
            user: msg.sender,
            role: userRole,
            action: action,
            timestamp: block.timestamp,
            details: data
        }));
        
        emit ActionTracked(msg.sender, userRole, action, timestamp);
    }
    
    function getActivityHistory(address user) 
        public 
        view 
        returns (ActionTrack[] memory) 
    {
        return activityHistory[user];
    }
    
    function getAllActivities(uint256 limit) 
        public 
        view 
        returns (DashboardActivity[] memory) 
    {
        uint256 size = allActivities.length;
        uint256 resultSize = size < limit ? size : limit;
        DashboardActivity[] memory result = new DashboardActivity[](resultSize);
        
        for(uint256 i = 0; i < resultSize; i++) {
            result[i] = allActivities[size - 1 - i];
        }
        
        return result;
    }
    
    function trackDashboardAccess() public {
        emit DashboardAccessed(
            msg.sender,
            userRoles[msg.sender],
            block.timestamp
        );
    }
    
    function purchaseProducts(string[] memory productIds, uint256[] memory quantities) public {
        require(productIds.length == quantities.length, "Arrays length mismatch");
        
        for (uint i = 0; i < productIds.length; i++) {
            string memory productId = productIds[i];
            
            // Check if product exists and get its data
            Product storage product = products[productId];
            require(bytes(product.productId).length > 0, "Product does not exist");
            require(product.quantity >= quantities[i], "Insufficient quantity");
            
            // Update product quantity
            product.quantity = product.quantity - quantities[i];
            product.status = Status.DELIVERED;
            
            // Add to product history
            productHistory[productId].push(TrackingUpdate({
                productId: productId,
                status: Status.DELIVERED,
                location: product.location,
                updatedBy: msg.sender,
                timestamp: block.timestamp
            }));
            
            // Emit event
            emit ProductPurchased(
                productId,
                msg.sender,
                quantities[i],
                block.timestamp
            );
        }
    }
} 