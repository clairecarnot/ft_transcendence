import asyncio
import curses
import signal
import websockets
import ssl
import json

import traceback
import logging
import httpx
import os

stop_event = asyncio.Event()
# res = open('res', 'w')


############################ CLASSES ############################


class WindowHeightTooSmall(Exception):
    def __init__(self, message="Window height too small"):
        super().__init__(message)


class WindowWidthTooSmall(Exception):
    def __init__(self, message="Window width too small"):
        super().__init__(message)


class Ball():
    def __init__(self, x, y, window_h):
        self.x = int(x)
        self.y = int(y)
        self.radius = int(window_h * 0.1)
        self.old_x = int(x)
        self.old_y = int(y)
    
    async def draw(self, window):
        window.addstr(int(self.old_y), int(self.old_x), " ")
        window.addstr(int(self.y), int(self.x), "▫")
        self.old_x = int(self.x)
        self.old_y = int(self.y)


class Paddle():
    def __init__(self, x, y, window_h):
        self.x = int(x)
        self.y = int(y)
        self.width = 1
        self.height = int(window_h / 7)
        self.old_x = int(x)
        self.old_y = int(y)
    
    async def draw(self, window):  
        for row in range(0, self.height - 1):
            window.addstr(int(self.old_y + row), int(self.old_x), " ")
        for row in range(0, self.height - 1):
            window.addstr(int(self.y + row), int(self.x), "█")
        self.old_x = int(self.x)
        self.old_y = int(self.y)


class Frame():
    def __init__(self, window_h, window_w):
        self.x = 0
        self.y = 1
        self.height = window_h - 1
        self.width = window_w
    
    async def draw(self, window):
        for col in range(0, self.width - 1):
            window.addch(0, col, "_")
            window.addch(0 + self.height - 1, col, "_")

        for row in range(1, self.height - 1):
            window.addch(row, 0, "|")
            window.addch(row, self.width - 1, "|")
            window.addch(row, int(self.width / 2), "│")
        
        window.insch(self.height - 1, self.width - 1, "|")
        window.addch(self.height - 1, int(self.width / 2), "│")
        window.addch(self.height - 1, 0, "|")


class Game ():
    def __init__(self, stdscr):
        curses.curs_set(0)
        self.window = stdscr

        self.window_h, self.window_w = self.window.getmaxyx() #  height / width of the terminal window in number of rows / columns
        if self.window_h < 20:
            raise WindowHeightTooSmall
        if self.window_w < 53:
            raise WindowWidthTooSmall
        # print(f"window_h = {self.window_h}", file = res)
        # print(f"window_w = {self.window_w}", file = res)

        self.frame = Frame(self.window_h, self.window_w)
        self.ball = Ball(self.window_w / 2, self.window_h / 2, self.window_h)
        self.paddle_l = Paddle(2, self.window_h / 2, self.window_h)
        self.paddle_r = Paddle(self.window_w - 3, self.window_h / 2, self.window_h)

        self.key_w = False
        self.key_s = False
        self.arrow_up = False
        self.arrow_down = False

        # self.oldpoints = 0
        # self.points = 0

        self.end_reached = 0
        self.score_l = 0
        self.score_r = 0

    async def draw_loop(self):
        # self.window.clear()

        if self.end_reached == 1:
            self.window.clear()
            self.window.addstr(int(self.window_h / 2), int(self.window_w / 2) - 7, f"END OF THE GAME")
            self.window.addstr(int(self.window_h / 2) + 1, int(self.window_w / 2) - 2, f"{self.score_l} - {self.score_r}")
            self.end_reached = 2
        elif self.end_reached == 2:
            pass
        else:
            draworder = sorted([self.frame, self.ball, self.paddle_l, self.paddle_r], key=lambda o: o.x)
            for o in draworder:
                await o.draw(self.window)
            self.window.refresh()

    async def on_keydown(self, websocket):
        
        key = self.window.getch()

        if key == -1:
            return
        else:
            if key == ord('w'):
                self.key_w = True
            elif key == ord('s'):
                self.key_s = True
            elif key == curses.KEY_UP:
                self.arrow_up = True
            elif key == curses.KEY_DOWN:
                self.arrow_down = True
            await websocket.send(json.dumps({
                "action": "playing",
                "keyW": self.key_w,
                "keyS": self.key_s,
                "arrowUp": self.arrow_up,
                "arrowDown": self.arrow_down,
            }))
            await asyncio.sleep(0.05)
            if key == ord('w'):
                self.key_w = False
            elif key == ord('s'):
                self.key_s = False
            elif key == curses.KEY_UP:
                self.arrow_up = False
            elif key == curses.KEY_DOWN:
                self.arrow_down = False
            await websocket.send(json.dumps({
                "action": "playing",
                "keyW": self.key_w,
                "keyS": self.key_s,
                "arrowUp": self.arrow_up,
                "arrowDown": self.arrow_down,
            }))


############################ COROUTINES ############################


async def on_open(websocket, game):
    local = {
        "action": "local",
        "paddle_h": game.paddle_l.height,
        "paddle_w": game.paddle_l.width,
        "container_h": game.window_h - 2,
        "container_w": game.window_w,
        "ball_radius": game.ball.radius,
    }
    await websocket.send(json.dumps(local))

async def coroutine1(game):
    # print("Coroutine 1 (drawloop) started", file = res)
    try:
        while not stop_event.is_set():
            # print("Coroutine 1 (drawloop) running", file = res)
            await game.draw_loop()
            await asyncio.sleep(0.005)
    except asyncio.exceptions.CancelledError:
    #    print("Exception drawloop", file = res)
       return
    # print("Coroutine 1 (drawloop) stopped", file = res)

async def coroutine2(websocket, game):
    # print("Coroutine 2 (keydown) started", file = res)
    try:
        while not stop_event.is_set():
            # print("Coroutine 2 (keydown)running", file = res)
            await game.on_keydown(websocket)
            await asyncio.sleep(0.005)
    except asyncio.exceptions.CancelledError:
    #    print("Exception keydown", file = res)
       return
    # print("Coroutine 2 (keydown) stopped", file = res)

async def handle_message(message, game):
    # print(f"{message}", file = res)
    data = json.loads(message)
    # print(f"data['paddle_left_pos_top_y'] = {data['paddle_left_pos_top_y']}", file = res)
    # print(f"data['paddle_right_pos_top_y'] = {data['paddle_right_pos_top_y']}", file = res)
    game.ball.x = int(data["ball_pos_center_x"] /100 * game.window_w)
    game.ball.y = int(data["ball_pos_center_y"] /100 * (game.window_h - 2)) + 1
    # print(f"game.ball.y = {game.ball.y}", file = res)
    game.paddle_l.y = int(data["paddle_left_pos_top_y"] /100 * game.window_h) + 1
    game.paddle_r.y = int(data["paddle_right_pos_top_y"] /100 * game.window_h) + 1
    # print(f"paddle_l.y = {game.paddle_l.y}", file = res)
    # print(f"paddle_r.y = {game.paddle_r.y}", file = res)
    # game.points = data['paddle_left_points'] + data['paddle_right_points']
    # if (game.points > game.oldpoints):
        # print(f"POINTS - {data['paddle_left_points']} : {data['paddle_right_points']}", file = res)
        # game.oldpoints = game.points
    if (data["active"] == "start"):
        game.paddle_l.x = int(data['paddle_left_pos_top_x'] /100 * game.window_w)
        game.paddle_r.x = int(data['paddle_right_pos_top_x'] /100 * game.window_w)
        # game.oldpoints = data['paddle_left_points'] + data['paddle_right_points']
    if (data["active"] == "L" or data["active"] == "R"):
        game.score_l = data['paddle_left_points']
        game.score_r = data['paddle_right_points']
        game.end_reached = 1


async def coroutine3(websocket, game):
    # print("Coroutine 3 (onmessage) started", file = res)
    try:
        while not stop_event.is_set():
            # print("Coroutine 3 (onmessage) running", file = res)
            message = await websocket.recv()
            await handle_message(message, game)
            await asyncio.sleep(0.005)
    except asyncio.exceptions.CancelledError:
    #    print("Exception handle msg", file = res)
       return
    # print("Coroutine 3 (onmessage) stopped", file = res)


############################ MAIN ROUTINES ############################


async def main(stdscr):
    try:
        def signal_handler1(signum, frame):
            # print("Signal handler triggered", file = res)
            # stop_event.set()
            tasks = asyncio.all_tasks()
            for task in tasks:
                if task.get_name() == "task1" or task.get_name() == "task2" or task.get_name() == "task3":
                    task.cancel()

        signal.signal(signal.SIGINT, signal_handler1)
        await play(stdscr)
        # res.close()
    except Exception as e:
        # print("Exception : ", e, file = res)
        # res.close()
        return


async def play(stdscr):
    # Tâches à exécuter
    access_token = ""
    refresh_token = ""
    game = Game(stdscr)
    stdscr.nodelay(True)

    try:
        async with httpx.AsyncClient(verify=False) as client:
            response = await client.post(
                'https://localhost:1234/backend/authent/login/',
                headers={'Content-Type': 'application/json'},
                data=json.dumps({'username': "user", 'password': "password"})
            )
            result = response.json()

            # print("Result:\n", result, file = res)

            if response.status_code == 200:
                access_token = result.get("access")
                refresh_token = result.get("refresh")
            else:
                # print("==== Login failed ====", file = res)
                return
    except Exception as error:
        # print("An error occurred : ", error, file = res)
        return

    # print("Access Token:", access_token, file = res)
    # print("Refresh Token:", refresh_token, file = res)

    uri = "wss://localhost:1234/ws/pong/cligame/"
    ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE

    headers = {
        "User-Agent": "CLI",
        "Origin": "https://localhost:1234",
        "Cookie": f"access_token={access_token}",
    }

    async with websockets.connect(uri, ssl=ssl_context, extra_headers=headers) as websocket:
        await on_open(websocket, game)
        
        tasks = [
            asyncio.create_task(coroutine1(game), name="task1"),
            asyncio.create_task(coroutine2(websocket, game), name="task2"),
            asyncio.create_task(coroutine3(websocket, game), name="task3"),
        ]

        # print("WEBSOCKET LOOP BEGIN", file = res)
        await asyncio.gather(*tasks)
        # await asyncio.gather(*tasks, return_exceptions=True)
        # for i, result in enumerate(results):
        #     if isinstance(result, Exception):
        #         print(f"Task {i} failed with exception: {result}", file = res)
        #     else:
        #         print(f"Task {i} succeeded with result: {result}", file = res)
        # print("WEBSOCKET LOOP END", file = res)
    
    # print("JUSTE AVANT WS CLOSE", file = res)
    await websocket.close()
    raise
    # stdscr.keypad(False)
    # stdscr.nodelay(True)
    # curses.nocbreak()
    # curses.echo()
    # curses.curs_set(1)
    # curses.endwin() # restore the terminal to its original operating mode
    # print("Quitting Pong ...", file = res)
    # # res.close()

if __name__ == "__main__":
    try:
        curses.wrapper(lambda stdscr: asyncio.run(main(stdscr)))
    except KeyboardInterrupt:
        print("Program terminated by user")
        # print("Program terminated by user", file = res)