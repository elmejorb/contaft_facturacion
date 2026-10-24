# Backup cloud — server side (Hostinger)

Despliegue en `innovacion-digital.com/backups-contaft/`:

- `upload.php` — recibe backup del cliente, valida token contra CRM.
- `listar.php` — devuelve lista de todos los backups (admin).
- `descargar.php` — baja un backup especifico (admin).
- `admin.html` — panel admin standalone HTML+JS vanilla.

**Setup inicial del server** (una vez):

```bash
# Dentro de la carpeta /backups-contaft/
openssl rand -hex 32 > admin_token.txt
chmod 600 admin_token.txt
# .htaccess que bloquea acceso web al token:
cat > .htaccess <<HT
<Files admin_token.txt>
  Order allow,deny
  Deny from all
</Files>
HT
# Y en data/ bloquear tambien los archivos del cliente:
echo "deny from all" > data/.htaccess
```

El admin_token.txt NO entra al repo (ver .gitignore). Si se compromete:
```bash
openssl rand -hex 32 > admin_token.txt
# y usar el nuevo token en el panel
```

Panel admin: https://innovacion-digital.com/backups-contaft/admin.html
