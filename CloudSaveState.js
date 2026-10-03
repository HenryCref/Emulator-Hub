import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = 'https://llnwsokwwqgghyrzhnng.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxsbndzb2t3d3FnZ2h5cnpobm5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4Nzg0MTEsImV4cCI6MjEwNjQ1NDQxMX0.13z82zKQqsY9T80WyzOif-F7LxsbHyJVtI5ar5L3hL0'
export const supabase = createClient(supabaseUrl, supabaseKey)

async function signInWithGooglePopup() {
    supabase.auth.signOut();
    // 1. Generate the URL and point the redirect to our new callback page
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            skipBrowserRedirect: true,
            redirectTo: window.location.origin + '/callback.html'
        }
    })

    if (error || !data?.url) {
        console.error('Error generating auth URL:', error?.message)
        return
    }

    // 2. Open the popup
    const width = 500, height = 650
    const left = window.screenX + (window.outerWidth - width) / 2
    const top = window.screenY + (window.outerHeight - height) / 2
    const popupFeatures = `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`

    const popup = window.open(data.url, 'SupabaseAuthPopup', popupFeatures)

    // 3. Actively poll for the session 
    const checkSession = setInterval(async () => {
        // Did the user close the popup manually before finishing?
        if (popup && popup.closed) {
            clearInterval(checkSession)
        }

        // Check if the session was successfully saved by the callback page
        const { data: { session } } = await supabase.auth.getSession()

        if (session) {
            clearInterval(checkSession)
            console.log('User successfully logged in! ID:', session.user.id)
            window.EJS_emulator.displayMessage("Successfully Logged In")
            window.UID = session.user.id

            // If the popup somehow didn't close itself, force it shut
            if (popup && !popup.closed) {
                popup.close()
            }

            // TODO: Run your setup functions here (e.g., fetch their save files)
        }
    }, 1000) // Check every 1 second
}

async function checkUserSession() {
    const { data: { session }, error } = await supabase.auth.getSession()

    if (session) {
        const userId = session.user.id
        console.log('User is logged in! ID:', userId)

        // Now you can pass `userId` into your uploadSaveState() and downloadSaveState() functions
        return userId
    } else {
        console.log('No user is currently logged in.')
        return null
    }
}

async function uploadSaveState(saveFile, gameId, userId = 'default_user') {
    // We use `upsert: true` so it overwrites any existing save for this game.
    const filePath = `${userId}/${gameId}.state`

    const { data, error } = await supabase.storage
        .from('saves') // Must match your bucket name
        .upload(filePath, saveFile, {
            cacheControl: '10800',
            upsert: true
        })

    if (error) {
        console.error('Failed to upload save state:', error.message)
        return false
    }

    console.log('Save state uploaded successfully!', data)
    return true
}

async function downloadSaveState(gameId, userId = 'default_user') {
    const filePath = `${userId}/${gameId}.state`

    const { data, error } = await supabase.storage
        .from('saves')
        .download(filePath)

    if (error) {
        console.error('Failed to download save state:', error.message)
        return null
    }

    // Supabase returns a Blob. We MUST convert it for EmulatorJS.
    const arrayBuffer = await data.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)

    console.log('Save state downloaded and converted successfully!')

    return uint8Array
}

window.EJS_onSaveState = function ({ state }) {
    if (window.UID) {
        uploadSaveState(state, EJS_gameName, window.UID).then((bool) => {
            if (bool) {
                window.EJS_emulator.displayMessage("State Saved");
            } else {
                window.EJS_emulator.displayMessage("Save Failed");
            };
        });
    } else {
        window.EJS_emulator.displayMessage("No Login")
    };
};

window.EJS_onLoadState = function () {
    if (window.UID) {
        downloadSaveState(EJS_gameName, window.UID).then((state) => {
            if (state) {
                window.EJS_emulator.gameManager.loadState(state)
                window.EJS_emulator.displayMessage("State Loaded")
            } else {
                window.EJS_emulator.displayMessage("Load Failed")
            }
        })
    } else {
        window.EJS_emulator.displayMessage("No Login")
    };
};
//create button in menubar
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
            signInWithGooglePopup();
        });

        toolbar.insertBefore(btn, document.getElementsByClassName('ejs_menu_bar_spacer')[0]);
    }
};
//exit functionality
document.addEventListener("click", function (event) {
    const target = event.target;

    if (target && target.tagName === 'BUTTON' && target.textContent.trim() === 'Exit') {
        window.frameElement.src = "about:blank"
    }
}, true);
//load settings
window.EJS_onGameStart = function () {
    if (localStorage.getItem(`controls_loaded - ${window.EJS_gameName}`) === null) {
        localStorage.setItem(`controls_loaded - ${window.EJS_gameName}`, "true");
        window.EJS_emulator.controls[0][27] = { "value": 67 };
        window.EJS_emulator.controls[0][28] = { "value": 68 };
        window.EJS_emulator.changeSettingOption("rewindEnabled", "enabled");
        console.log("controls changed sucessfully")
        setTimeout(() => {
            window.location.reload()
        }, 100);
    };
};

window.UID = await checkUserSession();