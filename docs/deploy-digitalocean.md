# Deploy en DigitalOcean para `cliniq.lat`

Esta app ya está preparada para quedar así en el Droplet:

- `nginx` del servidor sirve el frontend estático desde `dist/`
- `nginx` proxea `/api` al backend Node en `127.0.0.1:4000`
- `docker compose` corre:
  - `db`
  - `api`

## 1. DNS del dominio

En tu proveedor del dominio:

- crea un registro `A` para `cliniq.lat` apuntando a la IP publica del Droplet
- crea otro `A` para `www.cliniq.lat` apuntando a la misma IP

## 2. Entrar al Droplet

```bash
ssh root@TU_IP_DEL_DROPLET
```

## 3. Instalar dependencias base

Ubuntu/Debian:

```bash
apt update
apt install -y git nginx certbot python3-certbot-nginx docker.io docker-compose-plugin curl
systemctl enable --now docker
systemctl enable --now nginx
```

Para construir el frontend en el servidor tambien necesitas Node:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
```

## 4. Clonar el repo

```bash
mkdir -p /opt/cliniq
git clone https://github.com/ramoncorquiz1997/mediapp.git /opt/cliniq/app
cd /opt/cliniq/app
```

## 5. Crear variables de produccion

```bash
cat > /opt/cliniq/app/.env.prod <<'EOF'
POSTGRES_USER=mediapp
POSTGRES_PASSWORD=CAMBIA_ESTA_CONTRASENA
POSTGRES_DB=mediapp
EOF
```

## 6. Levantar backend y base

```bash
cd /opt/cliniq/app
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

Verifica:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml ps
curl http://127.0.0.1:4000/api/health
```

## 7. Construir frontend

```bash
cd /opt/cliniq/app
npm ci
npm run build
mkdir -p /var/www/cliniq
rsync -av --delete dist/ /var/www/cliniq/dist/
```

## 8. Configurar nginx

```bash
cp /opt/cliniq/app/deploy/nginx/cliniq.lat.conf.example /etc/nginx/sites-available/cliniq.lat
ln -s /etc/nginx/sites-available/cliniq.lat /etc/nginx/sites-enabled/cliniq.lat
nginx -t
systemctl reload nginx
```

Si tienes otra pagina en el mismo Droplet, no pasa nada:

- esa otra pagina seguira con su propio `server_name`
- `cliniq.lat` tendra su propio archivo en `sites-available`

## 9. SSL con Let's Encrypt

Cuando el DNS ya apunte al Droplet:

```bash
certbot --nginx -d cliniq.lat -d www.cliniq.lat
```

Al final prueba:

```bash
curl -I https://cliniq.lat
curl -I https://cliniq.lat/api/health
```

## 10. Despliegue de cambios

Cada vez que subas cambios a GitHub:

```bash
cd /opt/cliniq/app
git pull origin main
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
npm ci
npm run build
rsync -av --delete dist/ /var/www/cliniq/dist/
systemctl reload nginx
```

## 11. Respaldos minimos recomendados

Dump diario manual:

```bash
mkdir -p /opt/backups/cliniq
docker compose --env-file /opt/cliniq/app/.env.prod -f /opt/cliniq/app/docker-compose.prod.yml exec -T db \
  pg_dump -U mediapp mediapp > /opt/backups/cliniq/mediapp-$(date +%F).sql
```

## 12. Que puertos deben quedar expuestos

Publicos:

- `80`
- `443`

Solo local:

- `4000` para la API
- Postgres no debe exponerse a internet

## 13. Pruebas finales

- `https://cliniq.lat/` debe mostrar el landing
- `https://cliniq.lat/login` debe abrir login médico
- `https://cliniq.lat/agenda/dra-paulina` debe abrir agenda publica
- `https://cliniq.lat/api/health` debe responder ok

## 14. Notas importantes

- El frontend usa rutas relativas `/api`, por eso `nginx` debe servir frontend y proxear backend en el mismo dominio
- Si subes un logo grande, el `client_max_body_size 10m` del `nginx` ya ayuda
- Antes de salir a produccion real, conviene agregar backups automaticos, monitoreo y endurecer seguridad del servidor
