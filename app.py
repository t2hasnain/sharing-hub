from flask import Flask, render_template, request, redirect, url_for, jsonify, session
from flask_socketio import SocketIO, emit, join_room
import os
import uuid
import datetime
import json
from werkzeug.utils import secure_filename

app = Flask(__name__, 
    static_folder='app/static',
    template_folder='app/templates')
app.config['SECRET_KEY'] = os.urandom(24).hex()
app.config['UPLOAD_FOLDER'] = 'app/static/uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16 MB max upload
socketio = SocketIO(app, cors_allowed_origins="*")

# Ensure upload directory exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Keep track of connected devices
connected_devices = {}
device_counter = 0

# Storage for shared messages (persistent)
shared_messages = []
MAX_STORED_MESSAGES = 50
MESSAGES_FILE = 'app/static/data/messages.json'

# Storage for chat messages (separate from sharing hub)
chat_messages = []

# Ensure data directory exists
os.makedirs(os.path.dirname(MESSAGES_FILE), exist_ok=True)

# Load existing messages from file
def load_messages():
    global shared_messages
    try:
        if os.path.exists(MESSAGES_FILE):
            with open(MESSAGES_FILE, 'r') as f:
                shared_messages = json.load(f)
    except Exception as e:
        print(f"Error loading messages: {e}")
        shared_messages = []

# Save messages to file
def save_messages():
    try:
        with open(MESSAGES_FILE, 'w') as f:
            json.dump(shared_messages, f)
    except Exception as e:
        print(f"Error saving messages: {e}")

# Load messages on startup
load_messages()

# Helper function to detect device type
def detect_device(user_agent):
    ua = user_agent.lower()
    if 'mobile' in ua:
        return 'mobile'
    elif 'tablet' in ua:
        return 'tablet'
    else:
        return 'desktop'

# Generate device name
def generate_device_name(device_type):
    global device_counter
    device_counter += 1
    return f"{device_type.capitalize()} {device_counter}"

# Routes
@app.route('/')
def index():
    # Get the latest shared content for display on home page
    return render_template('index.html', shared_messages=shared_messages)

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/privacy')
def privacy():
    return render_template('privacy.html')

@app.route('/chat')
def chat():
    # Auto-join chat without username
    if 'device_id' not in session:
        return auto_join()
    return render_template('chat.html')

@app.route('/join', methods=['GET'])
def auto_join():
    device_id = str(uuid.uuid4())
    device_type = detect_device(request.user_agent.string)
    device_name = generate_device_name(device_type)
    
    session['device_id'] = device_id
    session['device_name'] = device_name
    session['device_type'] = device_type
    
    print(f"New device connected: {device_name} ({device_type}) - HTTP 200")
    return redirect(url_for('chat'))

@app.route('/get_session_data')
def get_session_data():
    """Return the current session data as JSON"""
    if 'device_id' in session:
        return jsonify({
            'device_id': session['device_id'],
            'device_name': session['device_name'],
            'device_type': session['device_type']
        })
    return jsonify({})

@app.route('/get_temporary_identity')
def get_temporary_identity():
    """Create a temporary identity for users on home page"""
    if 'device_id' not in session:
        device_id = str(uuid.uuid4())
        device_type = detect_device(request.user_agent.string)
        device_name = generate_device_name(device_type)
        
        session['device_id'] = device_id
        session['device_name'] = device_name
        session['device_type'] = device_type
        
        print(f"New temporary device: {device_name} ({device_type}) - HTTP 200")
    
    return jsonify({
        'userId': session['device_id'],
        'username': session['device_name'],
        'device': session['device_type']
    })

@app.route('/delete_message', methods=['POST'])
def delete_message():
    """Delete a message from the shared messages list"""
    try:
        data = request.json
        index = int(data.get('id', -1))
        
        if 0 <= index < len(shared_messages):
            # Check if it's an image and delete the file if it exists
            if 'image_url' in shared_messages[index]:
                image_url = shared_messages[index]['image_url']
                try:
                    # Extract filename from URL
                    filename = image_url.split('/')[-1]
                    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                    
                    # Delete the file if it exists
                    if os.path.exists(file_path):
                        os.remove(file_path)
                except Exception as e:
                    print(f"Error deleting file: {e}")
            
            # Remove from shared messages
            del shared_messages[index]
            
            # Save changes
            save_messages()
            
            # Notify all clients
            socketio.emit('content_deleted', {'id': index}, broadcast=True)
            
            return jsonify({'success': True})
        
        return jsonify({'success': False, 'error': 'Invalid index'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/get_all_media')
def get_all_media():
    """Get all media files for download"""
    media_files = []
    
    for message in shared_messages:
        if 'image_url' in message:
            # Extract filename from URL
            url = message['image_url']
            filename = url.split('/')[-1]
            
            media_files.append({
                'url': url,
                'filename': filename
            })
    
    return jsonify({'files': media_files})

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    filename = secure_filename(file.filename)
    timestamp = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
    unique_filename = f"{timestamp}_{filename}"
    
    file.save(os.path.join(app.config['UPLOAD_FOLDER'], unique_filename))
    
    return jsonify({
        'filename': unique_filename,
        'url': url_for('static', filename=f'uploads/{unique_filename}')
    })

# Socket events
@socketio.on('connect')
def handle_connect():
    if 'device_id' in session and 'device_name' in session:
        device_id = session['device_id']
        connected_devices[device_id] = {
            'name': session['device_name'],
            'type': session['device_type']
        }
        
        join_room(device_id)
        emit('user_joined', {
            'username': session['device_name'],
            'user_id': device_id,
            'device': session['device_type'],
            'timestamp': datetime.datetime.now().isoformat()
        }, broadcast=True)
        
        print(f"Device {session['device_name']} connected via WebSocket - HTTP 200")

@socketio.on('get_online_users')
def handle_get_online_users():
    """Return a list of all connected users"""
    users = []
    
    for user_id, user_data in connected_devices.items():
        users.append({
            'user_id': user_id,
            'username': user_data['name'],
            'device': user_data['type']
        })
    
    emit('all_online_users', {'users': users})

@socketio.on('disconnect')
def handle_disconnect():
    if 'device_id' in session:
        device_id = session['device_id']
        if device_id in connected_devices:
            del connected_devices[device_id]
            
        emit('user_left', {
            'username': session['device_name'],
            'user_id': device_id,
            'timestamp': datetime.datetime.now().isoformat()
        }, broadcast=True)

@socketio.on('send_message')
def handle_message(data):
    message_data = {
        'username': session['device_name'],
        'user_id': session['device_id'],
        'device': session['device_type'],
        'message': data['message'],
        'timestamp': datetime.datetime.now().isoformat()
    }
    
    # Only add to shared_messages if coming from the sharing hub
    if request.referrer and '/chat' not in request.referrer:
        # Add to shared messages for sharing hub
        shared_messages.append(message_data)
        
        # Keep only the most recent messages
        if len(shared_messages) > MAX_STORED_MESSAGES:
            shared_messages.pop(0)
        
        # Save to disk
        save_messages()
    
    emit('new_message', message_data, broadcast=True)
    print(f"Message from {session['device_name']} - HTTP 200")

@socketio.on('send_image')
def handle_image(data):
    image_data = {
        'username': session['device_name'],
        'user_id': session['device_id'],
        'device': session['device_type'],
        'image_url': data['image_url'],
        'timestamp': datetime.datetime.now().isoformat()
    }
    
    # Only add to shared_messages if coming from the sharing hub
    if request.referrer and '/chat' not in request.referrer:
        # Add to shared messages for sharing hub
        shared_messages.append(image_data)
        
        # Keep only the most recent messages
        if len(shared_messages) > MAX_STORED_MESSAGES:
            shared_messages.pop(0)
        
        # Save to disk
        save_messages()
    
    emit('new_image', image_data, broadcast=True)
    print(f"Image from {session['device_name']} - HTTP 200")

if __name__ == '__main__':
    print("Starting Zephy Chat Server...")
    print("Waiting for devices to connect...")
    socketio.run(app, debug=True, host='0.0.0.0') 