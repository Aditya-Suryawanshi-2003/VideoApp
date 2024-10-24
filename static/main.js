const socket = io("/");
const main__chat_window = document.getElementById("main__chat_window");
const videoGrids = document.getElementById("video-grids");
const myVideo = document.createElement("video");
const chat = document.getElementById("chat");

let OtherUsername = "";
chat.hidden = true;
myVideo.muted = true;

// Display modal on window load
window.onload = () => {
    $(document).ready(function () {
        $("#getCodeModal").modal("show");
    });
};

// Initialize PeerJS
var peer = new Peer(undefined, {
    path: "/peerjs",
    host: "/",
    port: "3030",
});

let myVideoStream;
const peers = {};

// Get user media for video and audio
navigator.mediaDevices
    .getUserMedia({
        video: true,
        audio: true,
    })
    .then((stream) => {
        myVideoStream = stream;
        addVideoStream(myVideo, stream, myname);

        // Handle new user connections
        socket.on("user-connected", (id, username) => {
            connectToNewUser(id, stream, username);
            socket.emit("tellName", myname);
        });

        // Handle user disconnections
        socket.on("user-disconnected", (id) => {
            if (peers[id]) peers[id].close();
        });
    })
    .catch((err) => {
        console.error("Error accessing media devices:", err);
    });

// Handle incoming calls
peer.on("call", (call) => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then((stream) => {
            call.answer(stream); // Answer the call with the user's media stream
            const video = document.createElement("video");
            call.on("stream", (remoteStream) => {
                addVideoStream(video, remoteStream, OtherUsername);
            });
        })
        .catch((err) => {
            console.error("Failed to get local stream:", err);
        });
});

// Emit join-room event
peer.on("open", (id) => {
    socket.emit("join-room", roomId, id, myname);
});

// Handle messages
socket.on("createMessage", (message) => {
    var ul = document.getElementById("messageadd");
    var li = document.createElement("li");
    li.className = "message";
    li.appendChild(document.createTextNode(message));
    ul.appendChild(li);
});

// Store the other user's username
socket.on("AddName", (username) => {
    OtherUsername = username;
});

// Function to remove unused video divs
const RemoveUnusedDivs = () => {
    const alldivs = videoGrids.getElementsByTagName("div");
    for (let i = alldivs.length - 1; i >= 0; i--) {
        if (alldivs[i].getElementsByTagName("video").length === 0) {
            alldivs[i].remove();
        }
    }
};

// Function to share the screen
const shareScreen = async () => {
    try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true,
        });

        // Stop the existing video track
        myVideoStream.getVideoTracks().forEach((track) => track.stop());

        // Replace the existing video track with the screen stream
        myVideoStream.addTrack(screenStream.getVideoTracks()[0]);

        // Broadcast the screen stream to other users
        socket.emit("screenShare", screenStream);

        // Add the screen stream to your video element
        addVideoStream(myVideo, screenStream, myname);
    } catch (error) {
        console.error("Error sharing screen:", error);
    }
};

// Listen for screen sharing from other users
socket.on("screenShare", (stream) => {
    const video = document.createElement("video");
    addVideoStream(video, stream, "Screen Share");
});

// Attach the share screen function to the button
document.getElementById("shareScreenBtn").addEventListener("click", shareScreen);

// Function to connect to a new user
const connectToNewUser = (userId, stream, myname) => {
    const call = peer.call(userId, stream);
    const video = document.createElement("video");
    call.on("stream", (userVideoStream) => {
        addVideoStream(video, userVideoStream, myname);
    });
    call.on("close", () => {
        video.remove();
        RemoveUnusedDivs();
    });
    peers[userId] = call;
};

// Function to cancel the modal
const cancel = () => {
    $("#getCodeModal").modal("hide");
};

// Function to copy room link
const copy = async () => {
    const roomid = document.getElementById("roomid").innerText;
    await navigator.clipboard.writeText("http://localhost:3030/join/" + roomid);
};

// Function to show the invite box
const invitebox = () => {
    $("#getCodeModal").modal("show");
};

// Function to mute/unmute audio
const muteUnmute = () => {
    const audioTrack = myVideoStream.getAudioTracks()[0];
    audioTrack.enabled = !audioTrack.enabled;
    document.getElementById("mic").style.color = audioTrack.enabled ? "white" : "red";
};

// Function to mute/unmute video
const VideomuteUnmute = () => {
    const videoTrack = myVideoStream.getVideoTracks()[0];
    videoTrack.enabled = !videoTrack.enabled;
    document.getElementById("video").style.color = videoTrack.enabled ? "white" : "red";
};

// Function to show/hide chat
const showchat = () => {
    chat.hidden = !chat.hidden;
};

// Function to add video stream to the grid
const addVideoStream = (videoEl, stream, name) => {
    videoEl.srcObject = stream;
    videoEl.addEventListener("loadedmetadata", () => {
        videoEl.play();
    });
    const h1 = document.createElement("h1");
    const h1name = document.createTextNode(name);
    h1.appendChild(h1name);
    const videoGrid = document.createElement("div");
    videoGrid.classList.add("video-grid");
    videoGrid.appendChild(h1);
    videoGrid.appendChild(videoEl);
    videoGrids.appendChild(videoGrid);
    RemoveUnusedDivs();
    
    // Adjust video width based on total users
    let totalUsers = document.getElementsByTagName("video").length;
    if (totalUsers > 1) {
        for (let index = 0; index < totalUsers; index++) {
            document.getElementsByTagName("video")[index].style.width = (100 / totalUsers) + "%";
        }
    }
};

// Initialize user media
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then((stream) => {
        localVideo.srcObject = stream; // Set local video stream
        myVideoStream = stream; // Store the user's video stream
    })
    .catch((err) => {
        console.error("Error accessing media devices:", err);
    });

// Recording variables
let mediaRecorder;
let recordedChunks = [];
let isRecording = false;

// Start screen recording
document.getElementById('startRecording').onclick = async () => {
    if (isRecording) return;

    try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true
        });

        mediaRecorder = new MediaRecorder(screenStream);

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = handleStopRecording;
        mediaRecorder.start();
        isRecording = true;

        document.getElementById('stopRecording').disabled = false;
    } catch (err) {
        console.error("Error starting screen recording: ", err);
    }
};

// Stop screen recording
document.getElementById('stopRecording').onclick = () => {
    if (!isRecording) return;

    mediaRecorder.stop();
    isRecording = false;
    document.getElementById('stopRecording').disabled = true;
};

// Handle recorded video
function handleStopRecording() {
    const blob = new Blob(recordedChunks, { type: 'video/mp4' });
    recordedChunks = [];

    const videoURL = URL.createObjectURL(blob);

    // Create a link to download the video
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = videoURL;
    a.download = 'screen-recording.mp4';
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(videoURL);
    document.body.removeChild(a);
}

document.getElementById('whiteboardButton').addEventListener('click', () => {
    window.open('https://miro.com/app/board/uXjVLOmB8Ik=/','_blank'); // Opens link in a new tab
});
