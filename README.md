💾 SD Card AutoCopy Utility
A lightweight, compiled utility (using Node.js and pkg) designed to automatically detect newly inserted SD cards or removable drives on Windows and instantly copy a designated set of files to a specific folder on the detected drive.

✨ Features
Automatic Detection: Constantly monitors the system for new drive insertions.
One-Time Copy: Executes a full file copy immediately upon detection.
Copy Skip Logic: Automatically skips copying if the destination folder already contains files, preventing unnecessary wear.
Persistence: Tracks the total number of successful copies across sessions using a local log file (autocopy_log.txt).
Console & Notifications: Provides real-time status updates in the console and through native desktop notifications.

🛠️ Setup and Installation
Prerequisites
Node.js: Ensure you have Node.js (version 16 or newer) installed.
Project Files: Clone or download the project files, specifically package.json and autocopy.js.
Step 1: Install Dependencies
Navigate to your project directory (the folder containing package.json and autocopy.js) and install the required Node modules: 'npm install'

Step 2: Configure the Master Folder
The utility needs to know exactly which files to copy.
Create a folder named files_to_copy inside your project directory (or wherever you want to store your source files).
Place all the files you want copied onto the SD cards inside this folder.
Crucially: Open autocopy.js and verify the MASTER_FOLDER path is correct.
Note: We configured this to use an absolute path for reliability within the compiled executable. If you move your project, you must update this line:
// autocopy.js
const MASTER_FOLDER = 'C:\\Users\\COMPUTER NAME HERE\\Desktop\\Autocopy v2\\project\\files_to_copy';

Step 3: Compile the Executable
Use the pkg tool (included in package.json) to compile the script into a standalone Windows executable.
'npm run build'
This command will create a file named sdcard-autocopy.exe in your project folder. This is the only file you need to run the utility.

⚙️ Configuration (Inside autocopy.js)
You can customize the script's behavior by editing these variables before running npm run build:
Variable,Default Value,Description
POLLING_INTERVAL,5000,How often (in milliseconds) the script checks for new drives (5000ms = 5 seconds).
EXCLUDED_DRIVES,"['C:', 'E:']","A list of drive letters to ignore (e.g., your primary OS drive, DVD drive). Add any internal drives here."
DESTINATION_FOLDER_NAME,'AutoCopyFiles',The name of the folder created on the SD card where files are copied.

🚀 How to Use
Run the Utility: Double-click sdcard-autocopy.exe. A command window will open and begin logging the initialization process.
Initialization Log: You will see a log confirming the script is monitoring and loading the total copy count from autocopy_log.txt.
Insert SD Card: Insert your SD card or removable drive.
Copy Process:
The console will show: 🆕 New SD Card Detected: [DriveLetter]
It will show [COPY PROGRESS] Copying files now...
Wait for the process to complete.
Safe Ejection Signal: Once the copy is finished, look for the clear signal:
✅ [COPY SUCCESS] All files copied successfully to [DriveLetter]:\AutoCopyFiles
A desktop notification will confirm "Copy Complete!"
The console will update with the new Total Successful Copies.
Eject: Once you see the success message, you can safely eject the drive. The utility will log ❌ Drive Disconnected/Ejected: [DriveLetter] and return to the [MONITOR] Waiting for new card... state.

**Issue**
Log file resets (count = 1)
**Cause**
The executable is reading an old/corrupt log file or the new file path is not working.,
**Solution**
"Ensure the log path is correct: const LOG_FILE_PATH = path.join(path.dirname(process.execPath), 'autocopy_log.txt');"

**Issue**
Copy is skipped
**Casue**
The destination folder ([DriveLetter]:\AutoCopyFiles) already exists and contains files. 
**Solution**
"The script is working as intended. If you need to recopy, delete the AutoCopyFiles folder from the SD card first."

**Issue**
FATAL ERROR: Master folder not found
**Cause**
The absolute path defined in MASTER_FOLDER is wrong.
**Solution**
Double-check the path in autocopy.js and ensure the folder actually exists at that exact location.

**Issue**
Notifications don't appear
**Cause**
Native notification binaries weren't included during compilation.
**Solution**
"Verify your package.json contains the necessary pkg.assets block for node-notifier vendor files (e.g., snoretoast-x64.exe)."
