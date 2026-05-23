import socket
import threading
import time


def pipe(source, target):
    try:
        while True:
            data = source.recv(65536)
            if not data:
                break
            target.sendall(data)
    except Exception:
        pass
    finally:
        for sock in (source, target):
            try:
                sock.close()
            except Exception:
                pass


def handle(client):
    upstream = None
    for _ in range(80):
        try:
            upstream = socket.create_connection(("127.0.0.1", 9222))
            break
        except OSError:
            time.sleep(0.25)
    if upstream is None:
        client.close()
        return
    threading.Thread(target=pipe, args=(client, upstream), daemon=True).start()
    threading.Thread(target=pipe, args=(upstream, client), daemon=True).start()


listener = socket.socket()
listener.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
listener.bind(("0.0.0.0", 9223))
listener.listen(50)
print("cdp proxy listening on 0.0.0.0:9223", flush=True)

while True:
    client, _ = listener.accept()
    threading.Thread(target=handle, args=(client,), daemon=True).start()
