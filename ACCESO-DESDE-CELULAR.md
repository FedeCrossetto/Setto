# Acceder a Stitch Fitness desde el iPhone

## 1. Misma red Wi‑Fi
La PC y el iPhone tienen que estar en **la misma red Wi‑Fi**.

## 2. Levantar el servidor
En la carpeta del proyecto:
```bash
npm run dev
```
En la terminal vas a ver algo como:
- **Network: http://192.168.x.x:5173/** ← esa es la URL para el celular.

## 3. Permitir el puerto en Windows (Firewall)
Si desde el iPhone no carga, el Firewall de Windows suele estar bloqueando.

### Opción A – PowerShell (como Administrador)
Abrí PowerShell **como administrador** (clic derecho → Ejecutar como administrador) y ejecutá:
```powershell
netsh advfirewall firewall add rule name="Vite Stitch 5173" dir=in action=allow protocol=TCP localport=5173
```

### Opción B – Interfaz del Firewall
1. Buscá **Firewall de Windows Defender** → **Configuración avanzada**.
2. **Reglas de entrada** → **Nueva regla**.
3. Tipo: **Puerto** → Siguiente.
4. TCP, puertos locales: **5173** → Siguiente.
5. **Permitir la conexión** → Siguiente → Siguiente.
6. Nombre: por ejemplo **Vite Stitch 5173** → Finalizar.

## 4. Abrir en el iPhone
En Safari (o Chrome) del iPhone poné la URL **Network** que mostró la terminal, por ejemplo:
```
http://192.168.1.105:5173
```
(Reemplazá por la IP que te muestra `npm run dev`.)

## 5. Ver la IP de tu PC (por si no la ves en Vite)
En la PC, en PowerShell o CMD:
```bash
ipconfig
```
Buscá **Adaptador de LAN inalámbrica Wi-Fi** (o similar) y anotá **Dirección IPv4** (ej. 192.168.1.105). La URL en el celular sería: `http://ESA_IP:5173`.
