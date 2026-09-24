import re

path1 = r"C:\Users\Beto Finanças\Desktop\nuxt\app\composables\useDemandProducts.ts"
with open(path1, 'r', encoding='utf-8') as f:
    c1 = f.read()

c1 = c1.replace(
    "selectedProductId?: string",
    "selectedProductId?: string | null"
)

with open(path1, 'w', encoding='utf-8') as f:
    f.write(c1)

path2 = r"C:\Users\Beto Finanças\Desktop\nuxt\app\pages\demands\[id]\index.vue"
with open(path2, 'r', encoding='utf-8') as f:
    c2 = f.read()

c2 = c2.replace("newProductCategoryId: newProductCategoryId.value || undefined,", "newProductCategoryId: newProductCategoryId.value,")
c2 = c2.replace("newProductName: newProductName.value || undefined,", "newProductName: newProductName.value,")

with open(path2, 'w', encoding='utf-8') as f:
    f.write(c2)

print("Fixed selectedProductId type.")
