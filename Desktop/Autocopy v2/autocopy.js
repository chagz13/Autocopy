/**
 * SD Card Auto-Copy Script for Windows (Using systeminformation - No Node-gyp required)
 * This script continuously monitors for newly inserted removable drives (SD cards)
 * on Windows and copies files from the master folder.
 */

const si = require('systeminformation');
const fse = require('fs-extra');
const notifier = require('node-notifier');
const path = require('path');
const LOG_FILE_PATH = path.join(path.dirname(process.execPath), 'autocopy_log.txt');

// --- Configuration ---
const POLLING_INTERVAL = 5000; // Check every 5 seconds (5000ms)
const EXCLUDED_DRIVES = ['C:', 'E:']; // Drives to ignore

// Use the absolute path you confirmed:
const MASTER_FOLDER = 'C:\\Users\\LENOVO\\Desktop\\Autocopy v2\\project\\files_to_copy'; 

const DESTINATION_FOLDER_NAME = 'UNICEF_IYCF RECIPE_AUDIOBOOK';

// State variable to keep track of currently attached drives
let attachedDrives = new Set();
let successfulCopyCount = 0; // Counter for successful copies
/**
 * Sends a native system notification.
 */
function sendNotification(title, message, sound = 'default') {
    notifier.notify({
        title: title,
        message: message,
        sound: sound,
        // Ensure you've placed 'sdcard.ico' in the project folder for this to work
        icon: path.join(__dirname, 'sdcard.ico'), 
        wait: false 
    });
}

/**
 * Gets a list of all current removable drive letters.
 * @returns {Array<string>} List of drive letters (e.g., ['D:', 'F:'])
 */
async function getRemovableDrives() {
    const currentDrives = new Set();
    
    // 1. Get detailed file system information
    // This provides mount points and drive types.
    const fsData = await si.fsSize(); 

    fsData.forEach(disk => {
        // systeminformation uses 'E:' style paths for Windows mount points
        const driveLetter = disk.mount.toUpperCase().replace(/\\$/, '');
        
        // We assume any drive that is NOT C: or E: and has a reasonable size
        // and is not a system disk is a candidate. 
        // In the absence of a reliable 'isRemovable' flag from si.fsSize(), 
        // we filter only by mount points and common knowledge (removable drives 
        // usually have low usage/high free space initially).
        // For robustness, we rely primarily on EXCLUDED_DRIVES.
        
        // Filter out excluded drives and non-root mounts
        if (driveLetter.length === 2 && driveLetter.endsWith(':') && !EXCLUDED_DRIVES.includes(driveLetter)) {
            currentDrives.add(driveLetter);
        }
    });

    return Array.from(currentDrives);
}

/**
 * Initializes the script by reading the initial drive state.
 */
async function initialize() {
    console.log('✨ Initializing SD Card Auto-Copy Script...');

    // 1. Check if the master folder exists
    if (!fse.existsSync(MASTER_FOLDER)) {
        console.error(`\n🚨 FATAL ERROR: Master folder not found at: ${MASTER_FOLDER}`);
        console.error('Please create a folder named "files_to_copy" and place the files you want to copy inside it.');
        sendNotification(
            'Initialization Error', 
            'The required "files_to_copy" folder is missing. Script cannot run.', 
            true
        );
        return; 
    } else {
        console.log(`✅ Master folder found: ${MASTER_FOLDER}`);
    }

    // --- UPDATED: Load previous copy count (More robust) ---
    try {
        // Use synchronous existsSync to check
        if (fse.existsSync(LOG_FILE_PATH)) {
            // Use synchronous readFileSync
            const countData = fse.readFileSync(LOG_FILE_PATH, 'utf8');
            
            // Trim whitespace (like newlines) from the data before parsing
            successfulCopyCount = parseInt(countData.trim(), 10); 
            
            if (isNaN(successfulCopyCount)) {
                console.warn('[INIT] Log file content was invalid. Resetting count to 0.');
                successfulCopyCount = 0; // Reset if file content is invalid
            }
            console.log(`[INIT] Found ${successfulCopyCount} previous successful copies.`);
        } else {
            console.log('[INIT] Log file not found, starting count at 0.');
            // Use synchronous outputFileSync to create the file and value
            fse.outputFileSync(LOG_FILE_PATH, '0', 'utf8'); 
            successfulCopyCount = 0;
        }
    } catch (err) {
        console.error(`[INIT ERROR] Could not read log file: ${err.message}. Starting count at 0.`);
        successfulCopyCount = 0;
    }
    // --- END UPDATED SECTION ---

    // 2. Read current drives and populate the Set
    try {
        const initialDrives = await getRemovableDrives();
        initialDrives.forEach(drive => {
            attachedDrives.add(drive);
            console.log(`[INIT] Existing drive added to tracking: ${drive}`);
        });

        console.log(`[INIT] Script is now monitoring for new drives every ${POLLING_INTERVAL/1000}s...`);
        sendNotification('Script Initialized', `Monitoring for new SD cards. (Ignoring ${EXCLUDED_DRIVES.join(', ')}).`);
    } catch (e) {
        console.error('[INIT ERROR] Failed to read initial drive list:', e.message || e);
        sendNotification('Initialization Error', 'Could not access drive information. See console.', true);
    }

    // 3. Start the continuous polling loop
    setInterval(monitorDrives, POLLING_INTERVAL);
}

/**
 * Monitors the system for changes in attached drives.
 */
async function monitorDrives() {
    try {
        const currentDrivesArray = await getRemovableDrives();
        const currentDrives = new Set(currentDrivesArray);

        // 1. Detect newly inserted drives
        for (const drive of currentDrives) {
            if (!attachedDrives.has(drive)) {
                // New drive detected!
                attachedDrives.add(drive);
                console.log(`\n🆕 New SD Card Detected: ${drive}`);
                sendNotification('SD Card Detected', `Starting copy to ${drive}`);
                processNewDrive(drive);
            }
        }

        // 2. Detect disconnected drives (important for re-insertion)
        for (const drive of attachedDrives) {
            if (!currentDrives.has(drive)) {
                attachedDrives.delete(drive);
                console.log(`\n❌ Drive Disconnected: ${drive}`);
            }
        }

    } catch (e) {
        console.error(`\n[DRIVE MONITOR ERROR] Failed to get drive list: ${e.message || e}`);
        sendNotification('Drive Monitor Error', 'Failed to check for new drives. See console for details.', true);
    }
}

/**
 * Handles the file copying process for a newly detected drive.
 */
async function processNewDrive(driveLetter) {
    const destinationPath = path.join(driveLetter, DESTINATION_FOLDER_NAME);

    // --- CHECK FOR EXISTING FILES ---
    const destExists = await fse.pathExists(destinationPath);
    if (destExists) {
        try {
            const files = await fse.readdir(destinationPath);
            if (files.length > 0) {
                console.log(`\n⚠️ [COPY SKIPPED] Files already exist on ${driveLetter}:\\${DESTINATION_FOLDER_NAME}. Copy skipped.`);
                sendNotification('Copy Skipped', `Files already found on ${driveLetter}. Eject to continue monitoring.`, false);
                return; 
            }
        } catch (readError) {
             console.warn(`[COPY WARNING] Could not read contents of ${destinationPath}. Proceeding with copy attempt.`);
        }
    }
    // --------------------------------

    console.log(`[COPY START] Source: ${MASTER_FOLDER} -> Destination: ${destinationPath}`);

    try {
        await fse.ensureDir(destinationPath);
        console.log(`[COPY STATUS] Created/Ensured destination folder: ${destinationPath}`);

        console.log(`[COPY PROGRESS] Copying files now... Please wait and DO NOT eject ${driveLetter}`);

        await fse.copy(MASTER_FOLDER, destinationPath, { overwrite: true, errorOnExist: false });

        console.log(`\n✅ [COPY SUCCESS] All files copied successfully to ${destinationPath}`);
        
        // --- UPDATED: Increment, log, and save the count (More robust) ---
        successfulCopyCount++;
        console.log(`[LOG] Total successful copies: ${successfulCopyCount}`);
        
        try {
            // Use synchronous outputFileSync to guarantee the file is written
            fse.outputFileSync(LOG_FILE_PATH, successfulCopyCount.toString(), 'utf8');
        } catch (err) {
            console.error(`[LOG ERROR] Failed to write to log file: ${err.message}`);
        }
        // --- END UPDATED SECTION ---

        sendNotification(
            'Copy Complete! 💾',
            `Files from 'files_to_copy' copied to ${destinationPath}. You can safely eject the drive now.`,
            'BEEP' 
        );

    } catch (err) {
        console.error(`\n🚨 [COPY ERROR] Failed to copy files to ${driveLetter}:`, err.message);
        sendNotification(
            'Copy Error ❌',
            `Failed to copy files to ${driveLetter}. Check drive permissions.`,
            true 
        );
    }
}
// Start the script
initialize();