from datetime import datetime
from pathlib import Path
import shutil
from fastapi import FastAPI, File,Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import subprocess
import json
import socket
import platform
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse
import os
import sys
from fastapi import FastAPI, Request
from fastapi.templating import Jinja2Templates
import uvicorn
import requests
import json
from fastapi.responses import HTMLResponse, JSONResponse


from threading import Thread
import asyncio
import psutil
import win32gui
import screeninfo
import win32ui
import win32con
import win32process
import win32api
import os
import pygame
import cv2
import numpy as np
import socketio
from socketio import ASGIApp


socketio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")

fastapi_app = FastAPI()

app = ASGIApp(socketio, other_asgi_app=fastapi_app)

settings = {
    "process_name": "TCScorer.exe",
    "capture_x": 17, "capture_y": 181,
    "capture_width": 1350, "capture_height": 452,
    "target_x": 1366, "target_y": 0,
    "screen_width": 1920, "screen_height": 1080
}

running = False
thread = None
BASE_DIR = os.path.dirname(os.path.abspath(__file__))  # api folder ka path
# Example: D:\New Project\Project\VMS_GUI\VMS_GUI\api

UPLOAD_FOLDER = os.path.join(BASE_DIR, "static/uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
def resource_path(relative_path):
    return os.path.join(os.path.dirname(__file__), relative_path)



@fastapi_app.get("/")
async def read_root():
    return FileResponse(resource_path("api/templates/index.html"))

# Serve scoreboard.html at "/scoreboard"
@fastapi_app.get("/scoreboard")
async def scoreboard():
    return FileResponse(resource_path("api/templates/scoreboard.html"))

def resource_path(relative_path):
    """ Get the absolute path to resource, works for PyInstaller and dev """
    try:
        base_path = sys._MEIPASS  # for PyInstaller bundle
    except Exception:
        base_path = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

    return os.path.join(base_path, relative_path)

fastapi_app.mount("/static", StaticFiles(directory=resource_path("api/static")), name="static")


def execute_command(args):
    # Portable paths
    jar_path = resource_path("MercurySDK.jar")
    lib_path = resource_path("lib/lib/*") if platform.system() != "Windows" else resource_path("lib\\lib\\*")

    # Classpath formatting based on OS
    classpath = f"{jar_path}:{lib_path}" if platform.system() != "Windows" else f"{jar_path};{lib_path}"

    command = ["java", "-cp", classpath, "MercurySDK"] + args

    try:
        result = subprocess.run(command, capture_output=True, text=True, encoding="utf-8", errors="ignore")
        return {
            "status": "success" if result.returncode == 0 else "error",
            "output": result.stdout.strip(),
        }
    except Exception as e:
        return {"status": "error", "output": str(e)}

# def execute_command(args):
#     # Define paths for the JAR and libraries
#     base_path = "/home/anand/Desktop/Projects/JAMAICA/GUI" if platform.system() != "Windows" else "C:\\Users\\anand\\Desktop\\Projects\\GUI"
#     jar_path = f"{base_path}/MercurySDK.jar" if platform.system() != "Windows" else f"{base_path}\\MercurySDK.jar"
#     lib_path = f"{base_path}/lib/lib/*" if platform.system() != "Windows" else f"{base_path}\\lib\\lib\\*"

#     # Construct the Java command with classpath (-cp)
#     command = ["java", "-cp", f"{jar_path}:{lib_path}", "MercurySDK"] + args if platform.system() != "Windows" \
#               else ["java", "-cp", f"{jar_path};{lib_path}", "MercurySDK"] + args

#     try:
#         print(f"Executing command: {' '.join(command)}")  # Debugging

#         # Run the Java command and capture output
#         result = subprocess.run(command, capture_output=True, text=True)

#         return {
#             "status": "success" if result.returncode == 0 else "error",
#             "output": result.stdout.strip(),
            
#         }

#     except Exception as e:
#         return {"status": "error", "output": str(e)}


fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development only - restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


UDP_PORT = 10001  # Default UDP port for search commands
BUFFER_SIZE = 1024  # Response buffer size


def send_udp_command(controller_ip: str, payload: dict):
    """Send a UDP command to a specific controller and receive the response."""
    message = json.dumps(payload).encode("utf-8")
    
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
        sock.settimeout(5)  # Timeout after 5 seconds
        sock.sendto(message, (controller_ip, UDP_PORT))

        try:
            response, _ = sock.recvfrom(BUFFER_SIZE)  # Receive response
            return json.loads(response.decode("utf-8"))
        except socket.timeout:
            return {"status": "failure", "message": f"Controller at {controller_ip} did not respond"}
        
@fastapi_app.get("/led/controller_status")
def search_control_cards(controller_ip: str = Query(..., description="Enter the controller IP")):
   
    payload = {
        "protocol": {
            "name": "YQ-COM2",
            "version": "1.0",
            "remotefunction": {
                "name": "SearchController",
                "input": {
                    "barcode": "",
                    "brightness": "",
                    "brightnessmode": "",
                    "gateway": "",
                    "height": "",
                    "httpserverport": "",
                    "ip": "",
                    "ipmode": "",
                    "mac": "",
                    "pid": "",
                    "subnetmask": "",
                    "width": ""
                }
            }
        }
    }

    response = send_udp_command(controller_ip, payload)

    if response and "remotefunction" in response:
        response["remotefunction"].pop("tracecode", None)

    return response

@fastapi_app.get("/led/check_connection")
def check_connection(ip: str, username: str, password: str):
    args = [ip, username, password, "check_connection"]
    return execute_command(args)

@fastapi_app.post("/led/clear_display")
def clear_display(ip: str, username: str, password: str):
    args = [ip, username, password, "clear_display"]
    return execute_command(args)



@fastapi_app.get("/led/get_play_mode")
def get_play_mode(ip: str, username: str, password: str):
    args = [ip, username, password, "get_play_mode"]
    return execute_command(args)

@fastapi_app.post("/led/switch_play_mode")
def switch_play_mode(data: dict):
    
    ip = data["ip"]
    username = data["username"]
    password = data["password"]
    mode = data["mode"]
    
    args = [ip, username, password, "switch_play_mode", mode]
    return execute_command(args)

@fastapi_app.post("/led/set_controller_ip")
def set_network(controller_ip: str, new_ip: str, subnetmask: str, gateway: str):
    
    payload = {
        "protocol": {
            "name": "YQ-COM2",
            "version": "1.0",
            "remotefunction": {
                "name": "setNetworkOption",
                "input": {
                    "ip": new_ip,
                    "subnetMask": subnetmask,
                    "gateway": gateway,
                    "ipmode": "static"
                }
            }
        }
    }
    response = send_udp_command(controller_ip, payload)

    if response and "remotefunction" in response:
        response["remotefunction"].pop("tracecode", None)

    return response

@fastapi_app.post("/led/restart_controller_network")
def restart_network(controller_ip: str):
    
    payload = {
        "protocol": {
            "name": "YQ-COM2",
            "version": "1.0",
            "remotefunction": {
                "name": "restartNetwork"
            }
        }
    }
    response = send_udp_command(controller_ip, payload)

    if response and "remotefunction" in response:
        response["remotefunction"].pop("tracecode", None)

    return response

@fastapi_app.post("/led/sync_time")
def sync_time(ip: str, username: str, password: str):
    args = [ip, username, password, "sync_time"]
    return execute_command(args)

@fastapi_app.post("/led/change_brightness")
def change_brightness(ip: str, username: str, password: str, brightness: int):
    args = [ip, username, password, "change_brightness", str(brightness)]
    return execute_command(args)

@fastapi_app.post("/led/display_text")
def display_text(data: dict):
    ip = data["ip"]
    username = data["username"]
    password = data["password"]
    t_x = str(data["t_x"])  
    t_y = str(data["t_y"])  
    t_width = str(data["t_width"])  
    t_height = str(data["t_height"])  
    text = data["text"]
    font_name = data["font_name"]
    font_size = str(data["font_size"])
    font_color = data["font_color"]
    bg_color = data["bg_color"]
    h_align = data["h_align"]
    v_align = data["v_align"]
    font_style = data["font_style"]
    animation_type = str(data["animation_type"])
    animation_speed = str(data["animation_speed"])

    args = [
        ip, username, password, "display_text", t_x, t_y, t_width, t_height, text, 
        font_name, font_size, font_color, bg_color, h_align, v_align, 
        font_style, animation_type, animation_speed
    ]
    return execute_command(args)

@fastapi_app.post("/upload/image")
async def upload_image(image: UploadFile = File(...)):
    save_path = os.path.join(UPLOAD_FOLDER, image.filename)
    
    with open(save_path, "wb") as f:
        shutil.copyfileobj(image.file, f)

    # Full absolute path
    full_path = os.path.abspath(save_path)

    # Relative path from BASE_DIR
    relative_path = os.path.relpath(save_path, start=BASE_DIR).replace("\\", "/")

    return {
        "status": "success",
        "url": f"/{relative_path}",           # frontend can use as image src
        "relative_path": relative_path,       # safe relative path for storage
        "full_path": full_path                # for internal backend use if needed
    }
    
@fastapi_app.post("/upload/video")
async def upload_video(video: UploadFile = File(...)):
    save_path = os.path.join(UPLOAD_FOLDER, video.filename)
    with open(save_path, "wb") as f:
        shutil.copyfileobj(video.file, f)

    # Full absolute path
    full_path = os.path.abspath(save_path)  

    # Relative path from project folder
    # Project folder se relative nikaalna (e.g. VMS_GUI/api/static/uploads/filename)
    relative_path = os.path.relpath(save_path, start=BASE_DIR)

    return {
        "status": "success",
        "relative_path": relative_path.replace("\\", "/"),  # Forward slashes for URLs
        "full_path": full_path
    }


@fastapi_app.post("/led/display_image")
def display_image(data: dict):
    """
    Endpoint to display an image at a specific position with custom size.
    """
    
    ip = data["ip"]
    username = data["username"]
    password = data["password"]
    i_x = str(data["i_x"])  # X Position
    i_y = str(data["i_y"])  # Y Position
    i_width = str(data["i_width"])  # Image Width
    i_height = str(data["i_height"])  # Image Height
    image_path = data["image_path"]  # Image File Path

    args = [
        ip, username, password, "display_image",
        i_x, i_y, i_width, i_height, image_path
    ]
    return execute_command(args)
        

@fastapi_app.post("/led/play_video")
def play_video(data: dict):
    """
    Endpoint to play a video at a specific position with custom size.
    """
    
    ip = data["ip"]
    username = data["username"]
    password = data["password"]
    v_x = str(data["v_x"])  # X Position
    v_y = str(data["v_y"])  # Y Position
    v_width = str(data["v_width"])  # Video Width
    v_height = str(data["v_height"])  # Video Height
    video_path = data["video_path"]  # Video File Path

    args = [
        ip, username, password, "play_video",
        v_x, v_y, v_width, v_height, video_path
    ]
    return execute_command(args)
   
@fastapi_app.post("/led/send_multiple_programs")
def send_multiple_programs(data: dict):
    """
    API to send multiple programs (text, image, or video) dynamically.
    """
    ip = data["ip"]
    username = data["username"]
    password = data["password"]
    programs = data["programs"]  

    #  Convert program details into JSON string
    json_input = json.dumps(programs)

    args = [ip, username, password, "send_multiple_programs", json_input]
    return execute_command(args)

@fastapi_app.post("/led/send_multiple_text_programs")
def send_multiple_text_programs(data: dict):
    """
    API to send multiple text-only programs to the LED screen.
    """
    ip = data["ip"]
    username = data["username"]
    password = data["password"]
    programs = data["programs"]  # List of text program definitions

    json_input = json.dumps(programs)

    args = [ip, username, password, "send_multiple_text_programs", json_input]
    return execute_command(args)



@fastapi_app.post("/led/capture")
def capture_screen(data: dict):
    ip = data["ip"]
    username = data["username"]
    password = data["password"]

    # Create folder on Desktop: ~/Pictures/screencapture
    desktop_path = Path.home() / "Pictures" / "screencapture"
    desktop_path.mkdir(parents=True, exist_ok=True)

    # Generate timestamped filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"capture_{timestamp}.png"
    desktop_file = desktop_path / filename

    # Execute command to capture image
    args = [ip, username, password, "capture", str(desktop_file)]
    result = execute_command(args)

    if result.get("status") == "success":
        # Copy image to static folder for web preview
        static_preview_folder = Path("static/images/screenpreview")
        static_preview_folder.mkdir(parents=True, exist_ok=True)
        static_file = static_preview_folder / filename
        shutil.copy(str(desktop_file), static_file)

        # Add image URL to result so frontend can use it
        result["image_url"] = f"/static/images/screenpreview/{filename}"

    return result

@fastapi_app.post("/led/display_multiple_text_areas")
def display_multiple_text_areas(data: dict):
    """
    Displays multiple text areas with individual settings.
    """
    ip = data["ip"]
    username = data["username"]
    password = data["password"]
    text_areas = data["text_areas"]

    json_input = json.dumps(text_areas)
    args = [ip, username, password, "display_multiple_text_areas", json_input]
    return execute_command(args)

@fastapi_app.post("/led/send_multiple_programs_with_textareas")
def send_multiple_programs_with_textareas(data: dict):
    """
    Sends multiple programs. Each program can contain multiple text areas, or a single image/video.
    """
    ip = data["ip"]
    username = data["username"]
    password = data["password"]
    programs = data["programs"]

    json_input = json.dumps(programs)
    args = [ip, username, password, "send_multiple_programs_with_textareas", json_input]
    return execute_command(args)


#  scoreboard code

def hide_taskbar_on_secondary():
    hwnd_taskbar = win32gui.FindWindow("Shell_TrayWnd", None)
    if hwnd_taskbar:
        win32gui.ShowWindow(hwnd_taskbar, win32con.SW_HIDE)

def show_taskbar():
    hwnd_taskbar = win32gui.FindWindow("Shell_TrayWnd", None)
    if hwnd_taskbar:
        win32gui.ShowWindow(hwnd_taskbar, win32con.SW_SHOW)

def lock_cursor_to_main_display():
    monitor_info = win32api.GetMonitorInfo(win32api.MonitorFromPoint((0, 0)))
    work_area = monitor_info["Work"]
    win32api.ClipCursor(work_area)

def unlock_cursor():
    win32api.ClipCursor(None)

def get_window_by_process(process_name):
    for proc in psutil.process_iter(['pid', 'name']):
        if process_name.lower() in proc.info['name'].lower():
            target_pid = proc.info['pid']

            def callback(hwnd, hwnd_list):
                _, found_pid = win32process.GetWindowThreadProcessId(hwnd)
                if found_pid == target_pid and win32gui.IsWindowVisible(hwnd):
                    hwnd_list.append(hwnd)

            hwnds = []
            win32gui.EnumWindows(callback, hwnds)

            if hwnds:
                return hwnds[0]
    return None

def capture_window_area(hwnd, x, y, width, height):
    if not hwnd:
        return None

    hdc_win = win32gui.GetWindowDC(hwnd)
    hdc_mem = win32ui.CreateDCFromHandle(hdc_win)
    hdc_compatible = hdc_mem.CreateCompatibleDC()
    bitmap = win32ui.CreateBitmap()
    bitmap.CreateCompatibleBitmap(hdc_mem, width, height)
    hdc_compatible.SelectObject(bitmap)
    hdc_compatible.BitBlt((0, 0), (width, height), hdc_mem, (x, y), win32con.SRCCOPY)

    bmp_info = bitmap.GetInfo()
    bmp_str = bitmap.GetBitmapBits(True)
    img = np.frombuffer(bmp_str, dtype=np.uint8)
    img.shape = (bmp_info['bmHeight'], bmp_info['bmWidth'], 4)
    img = cv2.cvtColor(img, cv2.COLOR_BGRA2RGB)

    win32gui.DeleteObject(bitmap.GetHandle())
    hdc_compatible.DeleteDC()
    win32gui.ReleaseDC(hwnd, hdc_win)

    return img
def display_on_custom_screen(process_name, capture_x, capture_y, capture_width, capture_height, target_x, target_y, screen_width, screen_height):
    hwnd = get_window_by_process(process_name)
    if not hwnd:
        return

    pygame.init()
    os.environ['SDL_VIDEO_WINDOW_POS'] = f"{target_x},{target_y}"
    window = pygame.display.set_mode((screen_width, screen_height), pygame.NOFRAME)
    pygame.display.set_caption("Projected Window")

    running = True
    clock = pygame.time.Clock()

    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False

        img = capture_window_area(hwnd, capture_x, capture_y, capture_width, capture_height)
        if img is not None:
            img = cv2.resize(img, (screen_width, screen_height))
            img = np.rot90(img)
            img = np.flipud(img)

            surface = pygame.surfarray.make_surface(img)
            window.blit(surface, (0, 0))
            pygame.display.flip()

        clock.tick(30)

    pygame.quit()

async def projection_worker():
    global running
    hide_taskbar_on_secondary()
    lock_cursor_to_main_display()
    while running:
        display_on_custom_screen(
            settings["process_name"],
            settings["capture_x"], settings["capture_y"],
            settings["capture_width"], settings["capture_height"],
            settings["target_x"], settings["target_y"],
            settings["screen_width"], settings["screen_height"]
        )
    show_taskbar()
    unlock_cursor()


# Event Handlers
@socketio.event
async def connect(sid, environ):
    print(f"Client connected: {sid}")
    await socketio.emit('message', 'Connected to server', to=sid)

@socketio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")

@socketio.event
async def message(sid, data):
    global running, thread, settings

    try:
        command = json.loads(data)
        
        if command["action"] == "start":
            if not running:
                running = True
                thread = Thread(target=lambda: asyncio.run(projection_worker()), daemon=True)
                thread.start()
                await socketio.emit('message', 'Projection started.', to=sid)
                
        elif command["action"] == "stop":
            running = False
            await socketio.emit('message', 'Projection stopped.', to=sid)
            
        elif command["action"] == "update":
            settings.update(command["settings"])
            await socketio.emit('message', f'Settings updated: {settings}', to=sid)
            
    except Exception as e:
        print("WebSocket error:", e)
        await socketio.emit('message', f'Error: {str(e)}', to=sid)

@fastapi_app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return FileResponse(resource_path("api/templates/index.html"))

# Scoreboard route
@fastapi_app.get("/scoreboard", response_class=HTMLResponse)
async def scoreboard(request: Request):
    return FileResponse(resource_path("api/templates/scoreboard.html"))

# Display info route
@fastapi_app.get("/displays")
async def display_info():
    monitors = [
        {
            "index": i,
            "x": m.x,
            "y": m.y,
            "width": m.width,
            "height": m.height
        }
        for i, m in enumerate(screeninfo.get_monitors())
    ]
    return JSONResponse(content={"displays": monitors})

# Running applications route
@fastapi_app.get("/running_apps")
async def running_apps():
    titles = []

    def callback(hwnd, _):
        if win32gui.IsWindowVisible(hwnd):
            title = win32gui.GetWindowText(hwnd)
            if title:
                titles.append(title)

    win32gui.EnumWindows(callback, None)
    return JSONResponse(content={"apps": titles})
if __name__ == "__main__":
    uvicorn.run(fastapi_app, host="0.0.0.0", port=8000)