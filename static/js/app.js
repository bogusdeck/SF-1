// DOM Elements
const joinModal = document.getElementById('joinModal');
const roomIdInput = document.getElementById('roomId');
const usernameInput = document.getElementById('username');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const createRoomBtn = document.getElementById('createRoomBtn');
const roomNameEl = document.getElementById('roomName');
const connectionStatusEl = document.getElementById('connectionStatus');
const userListEl = document.getElementById('userList');
const chatMessagesEl = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendMessageBtn = document.getElementById('sendMessageBtn');
const nowPlayingEl = document.getElementById('nowPlaying');
const playPauseBtn = document.getElementById('playPauseBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const progressBar = document.getElementById('progressBar');
const currentTimeEl = document.getElementById('currentTime');
const durationEl = document.getElementById('duration');
const volumeControl = document.getElementById('volumeControl');
const addToQueueBtn = document.getElementById('addToQueueBtn');
const queueListEl = document.getElementById('queueList');

// App state
let socket = null;
let currentUser = null;
let currentRoom = null;
let isHost = false;
let audioElement = null;
let isPlaying = false;
let currentTrack = null;
let playbackPosition = 0;
let updateInterval = null;

// Initialize the app
function init() {
    // Show the join modal by default
    joinModal.classList.remove('hidden');
    
    // Set up event listeners
    joinRoomBtn.addEventListener('click', joinRoom);
    createRoomBtn.addEventListener('click', createRoom);
    sendMessageBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    // Player controls
    playPauseBtn.addEventListener('click', togglePlayPause);
    prevBtn.addEventListener('click', playPrevious);
    nextBtn.addEventListener('click', playNext);
    volumeControl.addEventListener('input', updateVolume);
    
    // Initialize audio element
    audioElement = new Audio();
    audioElement.volume = volumeControl.value;
    
    // Set up audio event listeners
    audioElement.addEventListener('play', onAudioPlay);
    audioElement.addEventListener('pause', onAudioPause);
    audioElement.addEventListener('timeupdate', updateProgressBar);
    audioElement.addEventListener('ended', onTrackEnd);
    
    // Disable player controls initially
    updatePlayerControls();
}

// WebSocket connection
function connectWebSocket(roomId, userId) {
    const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
    const host = window.location.host;
    const wsUrl = `${protocol}${host}/api/room/ws/${roomId}/${userId}`;
    
    socket = new WebSocket(wsUrl);
    
    socket.onopen = function() {
        console.log('WebSocket connected');
        connectionStatusEl.textContent = 'Connected';
        connectionStatusEl.className = 'text-green-600 font-medium';
    };
    
    socket.onmessage = function(event) {
        const message = JSON.parse(event.data);
        handleWebSocketMessage(message);
    };
    
    socket.onclose = function() {
        console.log('WebSocket disconnected');
        connectionStatusEl.textContent = 'Disconnected';
        connectionStatusEl.className = 'text-red-600 font-medium';
        
        // Try to reconnect after 5 seconds
        setTimeout(() => {
            if (currentRoom && currentUser) {
                connectWebSocket(currentRoom.id, currentUser.id);
            }
        }, 5000);
    };
    
    socket.onerror = function(error) {
        console.error('WebSocket error:', error);
    };
}

// Handle WebSocket messages
function handleWebSocketMessage(message) {
    console.log('Received message:', message);
    
    switch (message.type) {
        case 'room_state':
            handleRoomState(message);
            break;
            
        case 'user_joined':
            addUserToList(message);
            addSystemMessage(`${message.username} joined the room`);
            break;
            
        case 'user_left':
            removeUserFromList(message.user_id);
            addSystemMessage(`${message.username} left the room`);
            break;
            
        case 'playback_update':
            handlePlaybackUpdate(message);
            break;
            
        case 'track_change':
            handleTrackChange(message.track);
            break;
            
        case 'chat_message':
            addChatMessage(message);
            break;
    }
}

// Handle initial room state
function handleRoomState(message) {
    currentRoom = message.room;
    roomNameEl.textContent = currentRoom.name;
    
    // Update user list
    userListEl.innerHTML = '';
    message.users.forEach(user => {
        addUserToList(user);
    });
    
    // Update current track if any
    if (currentRoom.current_track) {
        handleTrackChange(currentRoom.current_track);
    }
    
    // Update playback state
    if (currentRoom.is_playing) {
        audioElement.currentTime = currentRoom.last_playback_time || 0;
        audioElement.play().catch(e => console.error('Playback error:', e));
    } else {
        audioElement.pause();
        audioElement.currentTime = currentRoom.last_playback_time || 0;
        updateProgressBar();
    }
    
    updatePlayerControls();
}

// Handle track change
function handleTrackChange(track) {
    currentTrack = track;
    
    // Update UI
    nowPlayingEl.innerHTML = `
        <div class="text-2xl font-semibold">${track.title || 'Unknown Track'}</div>
        <div class="text-gray-600">${track.artist || 'Unknown Artist'}</div>
    `;
    
    // If host, update the audio source
    if (isHost) {
        audioElement.src = track.url;
        audioElement.load();
        
        // If track was playing, start playback
        if (currentRoom && currentRoom.is_playing) {
            audioElement.play().catch(e => console.error('Playback error:', e));
        }
    }
}

// Handle playback updates
function handlePlaybackUpdate(message) {
    if (!isHost) {
        if (message.is_playing) {
            audioElement.currentTime = message.current_time;
            audioElement.play().catch(e => console.error('Playback error:', e));
        } else {
            audioElement.pause();
            audioElement.currentTime = message.current_time;
        }
        updatePlayerControls();
    }
}

// Join an existing room
async function joinRoom() {
    const roomId = roomIdInput.value.trim();
    const username = usernameInput.value.trim();
    
    if (!roomId || !username) {
        alert('Please enter both room ID and your name');
        return;
    }
    
    try {
        // Check if room exists
        const response = await fetch(`/api/room/${roomId}/exists`);
        const data = await response.json();
        
        if (!data.exists) {
            throw new Error('Room not found');
        }
        
        // Create a temporary user (will be replaced with server-assigned user)
        currentUser = { id: 'temp', username, isHost: false };
        
        // Connect to WebSocket
        connectWebSocket(roomId, 'temp');
        
        // Hide the modal
        joinModal.classList.add('hidden');
        
    } catch (error) {
        console.error('Error joining room:', error);
        alert(`Failed to join room: ${error.message}`);
    }
}

// Create a new room
async function createRoom() {
    const username = usernameInput.value.trim();
    const roomName = prompt('Enter a name for your room:', `${username}'s Room`);
    
    if (!username || !roomName) {
        alert('Please enter your name and a room name');
        return;
    }
    
    try {
        // Create the room
        const response = await fetch('/api/room/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                room_name: roomName,
                username: username
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to create room');
        }
        
        const data = await response.json();
        
        // Set current user as host
        currentUser = { id: data.host_id, username, isHost: true };
        isHost = true;
        
        // Connect to WebSocket
        connectWebSocket(data.room_id, data.host_id);
        
        // Hide the modal
        joinModal.classList.add('hidden');
        
    } catch (error) {
        console.error('Error creating room:', error);
        alert(`Failed to create room: ${error.message}`);
    }
}

// Send chat message
function sendMessage() {
    const text = chatInput.value.trim();
    if (!text || !socket || socket.readyState !== WebSocket.OPEN) return;
    
    socket.send(JSON.stringify({
        type: 'chat_message',
        text: text
    }));
    
    // Clear input
    chatInput.value = '';
}

// Add user to the user list
function addUserToList(user) {
    // Check if user already exists in the list
    if (document.getElementById(`user-${user.id}`)) return;
    
    const userEl = document.createElement('div');
    userEl.id = `user-${user.id}`;
    userEl.className = 'flex items-center p-2 rounded hover:bg-gray-50';
    userEl.innerHTML = `
        <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold mr-3">
            ${user.username.charAt(0).toUpperCase()}
        </div>
        <div>
            <div class="font-medium">${user.username}</div>
            ${user.is_host ? '<span class="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Host</span>' : ''}
        </div>
    `;
    
    userListEl.appendChild(userEl);
}

// Remove user from the user list
function removeUserFromList(userId) {
    const userEl = document.getElementById(`user-${userId}`);
    if (userEl) {
        userEl.remove();
    }
}

// Add chat message to the chat window
function addChatMessage(message) {
    const messageEl = document.createElement('div');
    messageEl.className = 'flex mb-3';
    messageEl.innerHTML = `
        <div class="w-10 h-10 rounded-full bg-blue-100 flex-shrink-0 flex items-center justify-center text-blue-600 font-semibold mr-3">
            ${message.username.charAt(0).toUpperCase()}
        </div>
        <div>
            <div class="font-medium">${message.username}</div>
            <div class="text-gray-700">${message.text}</div>
            <div class="text-xs text-gray-400">${new Date(message.timestamp).toLocaleTimeString()}</div>
        </div>
    `;
    
    chatMessagesEl.appendChild(messageEl);
    chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

// Add system message to the chat window
function addSystemMessage(text) {
    const messageEl = document.createElement('div');
    messageEl.className = 'text-center text-sm text-gray-500 my-2';
    messageEl.textContent = text;
    chatMessagesEl.appendChild(messageEl);
    chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

// Player controls
function togglePlayPause() {
    if (!currentTrack) return;
    
    if (isHost) {
        if (audioElement.paused) {
            audioElement.play().catch(e => console.error('Playback error:', e));
        } else {
            audioElement.pause();
        }
        
        // Notify other clients
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                type: 'playback_update',
                is_playing: !audioElement.paused,
                current_time: audioElement.currentTime
            }));
        }
    }
}

function playPrevious() {
    // Implement play previous track logic
    // This would depend on your queue/track list implementation
}

function playNext() {
    // Implement play next track logic
    // This would depend on your queue/track list implementation
}

function updateVolume() {
    if (audioElement) {
        audioElement.volume = volumeControl.value;
    }
}

// Audio event handlers
function onAudioPlay() {
    isPlaying = true;
    updatePlayerControls();
    
    // Start progress update interval
    if (updateInterval) clearInterval(updateInterval);
    updateInterval = setInterval(updatePlaybackPosition, 1000);
}

function onAudioPause() {
    isPlaying = false;
    updatePlayerControls();
    
    // Clear progress update interval
    if (updateInterval) {
        clearInterval(updateInterval);
        updateInterval = null;
    }
}

function updateProgressBar() {
    if (!audioElement.duration) return;
    
    const progress = (audioElement.currentTime / audioElement.duration) * 100;
    progressBar.style.width = `${progress}%`;
    
    // Update time display
    currentTimeEl.textContent = formatTime(audioElement.currentTime);
    durationEl.textContent = formatTime(audioElement.duration);
}

function updatePlaybackPosition() {
    if (!isHost || !socket || socket.readyState !== WebSocket.OPEN) return;
    
    // Notify other clients of the current playback position
    socket.send(JSON.stringify({
        type: 'playback_update',
        is_playing: !audioElement.paused,
        current_time: audioElement.currentTime
    }));
}

function onTrackEnd() {
    // Auto-play next track if available
    playNext();
}

// Helper function to format time (seconds to MM:SS)
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
}

// Update player controls based on current state
function updatePlayerControls() {
    if (isPlaying) {
        playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
    } else {
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    }
    
    // Disable controls if not the host
    const controls = [playPauseBtn, prevBtn, nextBtn, addToQueueBtn];
    controls.forEach(control => {
        control.disabled = !isHost;
    });
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', init);
