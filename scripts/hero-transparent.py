"""
Hapus latar putih gambar hero FE-ZONE -> transparan, agar menyatu dengan background web.
Metode: flood-fill dari tepi gambar hanya mengangkat area putih yang terhubung ke tepi
(area putih di DALAM ilustrasi seperti baju seragam tetap utuh).
"""
from PIL import Image, ImageFilter
import numpy as np
from collections import deque

SRC = "/home/z/my-project/upload/Desain tanpa judul (6).png"
OUT = "/home/z/my-project/scripts/hero-transparent.png"

img = Image.open(SRC).convert("RGBA")
arr = np.array(img)
h, w = arr.shape[:2]
r, g, b = arr[..., 0].astype(int), arr[..., 1].astype(int), arr[..., 2].astype(int)
lum = (r + g + b) / 3

# 1) mask piksel mendekati putih
white = (r > 240) & (g > 240) & (b > 240)

# 2) flood fill dari semua tepi gambar
visited = np.zeros((h, w), dtype=bool)
dq = deque()
for x in range(w):
    for y in (0, h - 1):
        if white[y, x] and not visited[y, x]:
            visited[y, x] = True
            dq.append((y, x))
for y in range(h):
    for x in (0, w - 1):
        if white[y, x] and not visited[y, x]:
            visited[y, x] = True
            dq.append((y, x))
while dq:
    y, x = dq.popleft()
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        ny, nx = y + dy, x + dx
        if 0 <= ny < h and 0 <= nx < w and white[ny, nx] and not visited[ny, nx]:
            visited[ny, nx] = True
            dq.append((ny, nx))

# 3) dilasi 2px ke piksel terang di sebelah area terhapus (pangkas halo anti-alias)
for _ in range(2):
    grow = visited.copy()
    grow[1:, :] |= visited[:-1, :]
    grow[:-1, :] |= visited[1:, :]
    grow[:, 1:] |= visited[:, :-1]
    grow[:, :-1] |= visited[:, 1:]
    visited = grow & (lum > 215)

# 4) terapkan alpha + feather halus di tepi siluet
arr[..., 3] = np.where(visited, 0, arr[..., 3])
res = Image.fromarray(arr)
alpha = res.getchannel("A").filter(ImageFilter.GaussianBlur(0.7))
res.putalpha(alpha)
res.save(OUT)
print("saved:", OUT, "transparent px:", int(visited.sum()), "/", h * w)
