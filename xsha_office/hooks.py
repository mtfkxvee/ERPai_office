app_name = "xsha_office"
app_title = "AI Office"
app_publisher = "Lutpi"
app_description = "Visualisasi voxel 3D buat AI agent X-SHA, nempel di dalam ERPNext"
app_email = "lthv@x-sha.id"
app_license = "MIT"

# Sengaja TIDAK pakai app_include_js.
#
# Bundle 3D-nya (three.js + React Three Fiber) di-build pakai Vite, bukan esbuild
# bawaan Frappe. Alasannya: esbuild Frappe nggak resolve node_modules level-app
# dengan andal, dan dependency 3D itu gede — kalau dipaksa lewat sana, `bench build`
# jadi lambat dan rawan error resolve buat SEMUA app di bench ini (termasuk pos_next
# yang megang transaksi retail).
#
# Jadi: Vite yang nge-bundle jadi satu file self-contained, Frappe cuma nyajiin
# file statisnya di /assets/xsha_office/office/office.js, lalu Page-nya nge-load
# itu lewat frappe.require() dan mount langsung ke DOM page (native, bukan iframe).
