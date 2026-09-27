import "https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js";
import "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore-compat.js";
import "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth-compat.js";
import lzString from 'https://cdn.jsdelivr.net/npm/lz-string@1.5.0/+esm';

const firebaseConfig = {
    apiKey: "AIzaSyBBsfW596EMYpr_CRAKGbey8bzwph13O8Q",
    authDomain: "emulatorjs-saves.firebaseapp.com",
    projectId: "emulatorjs-saves",
    storageBucket: "emulatorjs-saves.firebasestorage.app",
    messagingSenderId: "887868463850",
    appId: "1:887868463850:web:a80b3cf39802d732115593",
    measurementId: "G-NLV8WNB743"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
let currentUid = null;

firebase.firestore().settings({
    experimentalForceLongPolling: true
});


function Login() {
    try {
        console.log("attempted login")
        auth.signInAnonymously(auth);
    } catch (error) {
        console.error("Authentication failed:", error)
    }
};

auth.onAuthStateChanged(function (user) {
    if (user) {
        currentUid = user.uid;
        console.log("Logged in anonymously with ID:", currentUid);
    } else {
        console.log("No previous login.");
        Login()
    }
});

function handleGoogleAuth() {
    const provider = new firebase.auth.GoogleAuthProvider();
    const currentUser = firebase.auth().currentUser;

    if (currentUser && currentUser.isAnonymous) {
        currentUser.linkWithPopup(provider)
            .then((result) => {
                console.log("Successfully linked guest progress to Google account");
                window.EJS_emulator.displayMessage(`Account ${result.user.email} linked`);
            })
            .catch((error) => {
                if (error.code === 'auth/credential-already-in-use') {
                    console.log("Google account already exists. Switching to existing account...");

                    firebase.auth().signInWithCredential(error.credential)
                        .then((result) => {
                            console.log("Logged in as returning user!", result.user.uid);
                            window.EJS_emulator.displayMessage(`save sate restored under ${result.user.email}`);
                        });
                } else {
                    console.error("Linking error:", error);
                }
            });
    } else {
        firebase.auth().signInWithPopup(provider)
            .then((result) => {
                console.log("Logged in with Google:", result.user.uid);
                window.EJS_emulator.displayMessage(`Logged in as: ${result.user.email}`);
            })
            .catch((error) => console.error("Sign-in error:", error));
    }
};

window.EJS_onSaveState = function ({ state }) {
    if (!currentUid) return;

    let binary = '';
    const len = state.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(state[i]);
    }
    const base64State = btoa(binary);

    const gameSaveData = {
        data: lzString.compressToUTF16(base64State),
        lastSaved: new Date().toISOString()
    };

    db.collection("games").doc(window.EJS_gameName).collection("users").doc(currentUid).set(gameSaveData)
        .then(function () {
            window.EJS_emulator.displayMessage("State saved");
        })
        .catch(function (error) {
            console.error("Error saving game data:", error);
        });
};

window.EJS_onLoadState = function () {
    db.collection("games").doc(window.EJS_gameName).collection("users").doc(currentUid).get({ source: "server" }).then((doc) => {
        if (!doc.exists) {
            console.log("No save state found.");
            return;
        }

        const compressedData = doc.data().data;

        const base64State = lzString.decompressFromUTF16(compressedData);

        const binaryString = atob(base64State);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        window.EJS_emulator.gameManager.loadState(bytes)
    }).catch((error) => {
        console.error("Error fetching save state:", error);
    });
};

window.EJS_ready = function () {
    const toolbar = document.getElementsByClassName('ejs_menu_bar')[0];

    if (toolbar) {
        const btn = document.createElement('div');
        btn.className = 'ejs_menu_button';
        btn.innerHTML = '<svg height = "18" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" clip-rule="evenodd" stroke-linejoin="round" stroke-miterlimit="2"><path d="M32.582 370.734C15.127 336.291 5.12 297.425 5.12 256c0-41.426 10.007-80.291 27.462-114.735C74.705 57.484 161.047 0 261.12 0c69.12 0 126.836 25.367 171.287 66.793l-73.31 73.309c-26.763-25.135-60.276-38.168-97.977-38.168-66.56 0-123.113 44.917-143.36 105.426-5.12 15.36-8.146 31.65-8.146 48.64 0 16.989 3.026 33.28 8.146 48.64l-.303.232h.303c20.247 60.51 76.8 105.426 143.36 105.426 34.443 0 63.534-9.31 86.341-24.67 27.23-18.152 45.382-45.148 51.433-77.032H261.12v-99.142h241.105c3.025 16.757 4.654 34.211 4.654 52.364 0 77.963-27.927 143.592-76.334 188.276-42.356 39.098-100.305 61.905-169.425 61.905-100.073 0-186.415-57.483-228.538-141.032v-.233z" fill="#fff"/></svg><span class="ejs_menu_text">Google Login</span>';

        btn.style.cursor = 'pointer';
        btn.style.display = 'flex';
        btn.style.alignItems = 'center';
        btn.style.justifyContent = 'center';
        btn.style.borderRadius = '3px';
        btn.style.padding = '7px'
        btn.style.transition = 'background 0.2s ease';

        btn.addEventListener('mouseenter', () => {
            btn.style.backgroundColor = window.EJS_color;
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.backgroundColor = 'transparent';
        });

        btn.addEventListener('click', () => {
            handleGoogleAuth();
        });

        toolbar.insertBefore(btn, document.getElementsByClassName('ejs_menu_bar_spacer')[0]);
    }
};

window.EJS_onExit = function () {
}