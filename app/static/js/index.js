document.addEventListener('DOMContentLoaded', () => {
    // Socket connection
    const socket = io();
    
    // DOM elements
    const contentGrid = document.getElementById('content-grid');
    const addContentBtn = document.getElementById('add-content-btn');
    const emptyAddBtn = document.getElementById('empty-add-btn');
    const downloadAllBtn = document.getElementById('download-all-btn');
    const tabButtons = document.querySelectorAll('.tab-btn');
    const addModal = document.getElementById('add-modal');
    const closeModalBtn = document.querySelector('.close-modal');
    const modalTabs = document.querySelectorAll('.modal-tab');
    const textForm = document.getElementById('text-form');
    const imageForm = document.getElementById('image-form');
    const imageInput = document.getElementById('image-input');
    const modalPreview = document.getElementById('modal-preview');
    
    // Initialize device info if available in session
    let currentUser = {
        username: null,
        userId: null,
        device: null
    };
    
    // Fetch session data from server
    fetch('/get_session_data')
        .then(response => response.json())
        .then(data => {
            if (data.device_id) {
                currentUser.username = data.device_name;
                currentUser.userId = data.device_id;
                currentUser.device = data.device_type;
            }
        })
        .catch(error => console.error('Error fetching session data:', error));
    
    // Tab switching functionality
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons
            tabButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            button.classList.add('active');
            
            // Filter content based on selected tab
            const tab = button.getAttribute('data-tab');
            filterContent(tab);
        });
    });
    
    // Filter content based on tab
    function filterContent(tabType) {
        const items = document.querySelectorAll('.content-item');
        
        items.forEach(item => {
            switch(tabType) {
                case 'all':
                    item.style.display = 'block';
                    break;
                case 'text':
                    if (item.getAttribute('data-type') === 'text') {
                        item.style.display = 'block';
                    } else {
                        item.style.display = 'none';
                    }
                    break;
                case 'images':
                    if (item.getAttribute('data-type') === 'image') {
                        item.style.display = 'block';
                    } else {
                        item.style.display = 'none';
                    }
                    break;
            }
        });
    }
    
    // Modal functionality
    function openModal() {
        addModal.classList.add('show');
    }
    
    function closeModal() {
        addModal.classList.remove('show');
        textForm.reset();
        imageForm.reset();
        modalPreview.innerHTML = '';
    }
    
    // Modal triggers
    if (addContentBtn) {
        addContentBtn.addEventListener('click', openModal);
    }
    
    if (emptyAddBtn) {
        emptyAddBtn.addEventListener('click', openModal);
    }
    
    closeModalBtn.addEventListener('click', closeModal);
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === addModal) {
            closeModal();
        }
    });
    
    // Modal tab switching
    modalTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            modalTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const type = tab.getAttribute('data-type');
            
            if (type === 'text') {
                textForm.classList.add('active');
                imageForm.classList.remove('active');
            } else {
                textForm.classList.remove('active');
                imageForm.classList.add('active');
            }
        });
    });
    
    // Image preview functionality
    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                modalPreview.innerHTML = `<img src="${e.target.result}" alt="Selected image">`;
            }
            reader.readAsDataURL(file);
        }
    });
    
    // Handle text submit
    textForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const textInput = document.getElementById('text-input');
        const message = textInput.value.trim();
        
        if (!message) return;
        
        if (!currentUser.userId) {
            // Not logged in, need to get a temporary identity
            fetch('/get_temporary_identity')
                .then(response => response.json())
                .then(data => {
                    currentUser = data;
                    sendTextMessage(message);
                    // Reload the page after a short delay
                    setTimeout(() => {
                        location.reload();
                    }, 500);
                });
        } else {
            sendTextMessage(message);
            // Reload the page after a short delay
            setTimeout(() => {
                location.reload();
            }, 500);
        }
        
        closeModal();
    });
    
    function sendTextMessage(message) {
        socket.emit('send_message', {
            message: message
        });
    }
    
    // Handle image submit
    imageForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const file = imageInput.files[0];
        
        if (!file) return;
        
        if (!currentUser.userId) {
            // Not logged in, need to get a temporary identity
            fetch('/get_temporary_identity')
                .then(response => response.json())
                .then(data => {
                    currentUser = data;
                    uploadAndSendImage(file);
                    // Reload the page after a short delay to allow image to be processed
                    setTimeout(() => {
                        location.reload();
                    }, 1000);
                });
        } else {
            uploadAndSendImage(file);
            // Reload the page after a short delay to allow image to be processed
            setTimeout(() => {
                location.reload();
            }, 1000);
        }
        
        closeModal();
    });
    
    function uploadAndSendImage(file) {
        const formData = new FormData();
        formData.append('file', file);
        
        fetch('/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            socket.emit('send_image', {
                image_url: data.url
            });
        })
        .catch(error => {
            console.error('Error uploading image:', error);
        });
    }
    
    // Replace the existing delete button handler with this simpler version
    document.addEventListener('click', function(e) {
        if (e.target.closest('.delete-btn')) {
            e.preventDefault();
            e.stopPropagation();
            
            const button = e.target.closest('.delete-btn');
            const id = button.getAttribute('data-id');
            
            console.log('Delete button clicked for item ID:', id);
            
            // Show delete in progress
            const item = button.closest('.content-item');
            item.style.opacity = '0.5';
            
            // Simple fetch to delete
            fetch('/delete_message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ id: parseInt(id) })
            })
            .then(function(response) {
                return response.json();
            })
            .then(function(data) {
                console.log('Delete response:', data);
                
                // Force reload regardless of success - solves index issues
                setTimeout(function() {
                    console.log('Reloading page after delete...');
                    window.location.href = window.location.href;
                }, 300);
            })
            .catch(function(error) {
                console.error('Error deleting:', error);
                // Reload anyway to ensure consistent state
                window.location.reload();
            });
            
            return false;
        }
    });
    
    // Download all functionality
    if (downloadAllBtn) {
        downloadAllBtn.addEventListener('click', () => {
            fetch('/get_all_media')
                .then(response => response.json())
                .then(data => {
                    if (data.files && data.files.length > 0) {
                        data.files.forEach(file => {
                            downloadFile(file.url, file.filename);
                        });
                    } else {
                        alert('No media files to download.');
                    }
                });
        });
    }
    
    function downloadFile(url, filename) {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
    
    // Add new content item to the grid
    function addNewContentItem(data) {
        // Create device icon
        let deviceIcon = '';
        if (data.device === 'desktop') {
            deviceIcon = '<i class="fas fa-desktop device-icon"></i>';
        } else if (data.device === 'mobile') {
            deviceIcon = '<i class="fas fa-mobile-alt device-icon"></i>';
        } else if (data.device === 'tablet') {
            deviceIcon = '<i class="fas fa-tablet-alt device-icon"></i>';
        }
        
        // Format timestamp
        const timestamp = new Date(data.timestamp);
        const formattedTime = timestamp.toLocaleString();
        
        // Create content based on type
        let content = '';
        let type = '';
        let downloadButton = '';
        
        if (data.image_url) {
            content = `
                <div class="item-image">
                    <img src="${data.image_url}" alt="Shared image">
                </div>
            `;
            type = 'image';
            downloadButton = `
                <a href="${data.image_url}" download class="item-action download-btn">
                    <i class="fas fa-download"></i>
                </a>
            `;
        } else if (data.message) {
            content = `
                <div class="item-text">
                    <p>${data.message}</p>
                </div>
            `;
            type = 'text';
        }
        
        // Create the item element
        const item = document.createElement('div');
        item.className = 'content-item';
        item.setAttribute('data-type', type);
        
        // Add the content
        item.innerHTML = `
            <div class="item-header">
                ${deviceIcon}
                <span class="item-username">${data.username}</span>
                <span class="item-time" title="${data.timestamp}">${formattedTime}</span>
            </div>
            <div class="item-content">
                ${content}
            </div>
            <div class="item-actions">
                ${downloadButton}
                <button class="item-action delete-btn" data-id="${contentGrid.children.length}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        // Handle the case when there's no content yet
        if (!contentGrid) {
            // No content grid exists, need to replace the no-content div
            const noContentDiv = document.querySelector('.no-content');
            if (noContentDiv) {
                const contentContainer = noContentDiv.parentElement;
                
                // Create new content grid
                const newGrid = document.createElement('div');
                newGrid.id = 'content-grid';
                newGrid.className = 'content-grid';
                
                // Add the new item to the grid
                newGrid.appendChild(item);
                
                // Replace no-content with the new grid
                contentContainer.innerHTML = '';
                contentContainer.appendChild(newGrid);
                
                // Update the contentGrid reference
                contentGrid = document.getElementById('content-grid');
            }
        } else {
            // Add the new item to the beginning of the grid
            contentGrid.insertBefore(item, contentGrid.firstChild);
            
            // Apply current filter
            const activeTab = document.querySelector('.tab-btn.active');
            if (activeTab) {
                filterContent(activeTab.getAttribute('data-tab'));
            }
        }
    }
    
    // Socket events with improved real-time handling
    socket.on('new_message', (data) => {
        if (document.querySelector('.content-container')) {
            addNewContentItem(data);
        }
    });
    
    socket.on('new_image', (data) => {
        if (document.querySelector('.content-container')) {
            addNewContentItem(data);
        }
    });
    
    socket.on('content_deleted', (data) => {
        const items = document.querySelectorAll('.content-item');
        if (items.length > 0 && items[data.id]) {
            items[data.id].remove();
            
            // Update the data-id attributes for all items
            document.querySelectorAll('.delete-btn').forEach((btn, index) => {
                btn.setAttribute('data-id', index);
            });
            
            // If it was the last item, show "no content" message
            if (items.length === 1) {
                const container = document.querySelector('.content-container');
                container.innerHTML = `
                    <div class="no-content">
                        <p>No content has been shared yet. Be the first to share!</p>
                        <button id="empty-add-btn" class="btn btn-secondary">Add Item</button>
                    </div>
                `;
                
                // Reattach event listener to the new button
                const newEmptyBtn = document.getElementById('empty-add-btn');
                if (newEmptyBtn) {
                    newEmptyBtn.addEventListener('click', openModal);
                }
            }
        }
    });
}); 