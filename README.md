# Inventario Comercial

Plataforma web para que el área comercial cargue tres archivos Excel y consulte el avance de inventario por distribuidora desde un link público.

## Archivos requeridos

1. Reporte de Activos PowerBI.
2. Registros de activos inventariados.
3. AVANCE DISTRIBUIDORAS.

## Ejecución local

```bash
npm install
npm start
```

Abrir:

```text
http://localhost:3000
```

## Deploy en AWS Lightsail

```bash
sudo apt update
sudo apt install -y git nodejs npm nginx
sudo npm install -g pm2

cd /opt
sudo git clone https://github.com/CarlosYamboly/inventario-comercial.git
sudo chown -R $USER:$USER /opt/inventario-comercial

cd /opt/inventario-comercial
npm install
pm2 start server.js --name inventario-comercial
pm2 save
pm2 startup
```

> Esta versión queda sin usuario ni contraseña si no se define `UPLOAD_PASSWORD`.

## Nginx

```bash
sudo tee /etc/nginx/sites-available/inventario-comercial >/dev/null <<'NGINX'
server {
    listen 80;
    server_name _;

    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX

sudo ln -sf /etc/nginx/sites-available/inventario-comercial /etc/nginx/sites-enabled/inventario-comercial
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

## Notas

- Los Excel cargados se guardan en `data/uploads/` dentro del servidor.
- Los archivos `.xlsx`, `.xls` y `manifest.json` están ignorados por Git para no subir data comercial al repositorio.
- Todos los usuarios que entren al link verán la última actualización guardada en el servidor.
