import re

path1 = r"C:\Users\Beto Finanças\Desktop\nuxt\app\pages\demands\[id]\index.vue"
with open(path1, 'r', encoding='utf-8') as f:
    c1 = f.read()

c1 = c1.replace(
    "newProductName: newProductName.value,",
    "newProductName: newProductName.value || undefined,"
)

with open(path1, 'w', encoding='utf-8') as f:
    f.write(c1)

print("Fixed type error.")
