# Estructura recomendada de base de datos

La app ya pide tres dominios principales: pacientes, agenda y expediente clínico. Para no pelearte luego con el crecimiento, la base debería quedar así:

## Tablas principales

### `pacientes`
- Un registro por paciente.
- Guarda identificador externo (`external_id`), nombre, fecha de nacimiento, sexo, tipo de sangre, teléfono y contacto de emergencia.
- Aqui tambien cabe un resumen rapido como `alergias_resumen` y `notas`.

### `antecedentes_medicos`
- Varias filas por paciente.
- Sirve para antecedentes heredofamiliares, patologicos, quirurgicos, alergicos, gineco-obstetricos o el tipo que luego quieras capturar.
- Evita meter todo en una sola columna gigante.

### `citas`
- Agenda del consultorio.
- Relación opcional con paciente para soportar citas nuevas o pacientes aún no registrados.
- Guarda fecha/hora de inicio, duracion, estado y motivo.

### `consultas`
- Nota médica principal.
- Relacion obligatoria con paciente y opcional con cita.
- Guarda motivo, padecimiento actual, exploración física, diagnóstico, plan y un `signos` en JSONB para no frenarte mientras el frontend evoluciona.

### `recetas`
- Uno a muchos desde `consultas`.
- Cada medicamento de la receta queda en su propia fila.

### `estudios`
- Ordenes o resultados de laboratorio/gabinete ligados a una consulta.

## Relaciones

- Un paciente puede tener muchas citas.
- Un paciente puede tener muchas consultas.
- Una cita puede terminar en una consulta.
- Una consulta puede tener muchas recetas.
- Una consulta puede tener muchos estudios.

## Por que asi

- Te deja avanzar rapido sin sobre-normalizar desde el dia uno.
- Mantiene compatible tu API actual, porque `consultas` sigue teniendo `signos`.
- Separa lo que si crece mucho con el tiempo: medicamentos, estudios y antecedentes.

## Estructura del repo

Puedes dejar todo en el mismo repo sin problema. La forma mas limpia para tu caso seria:

```text
mediapp/
  src/                # frontend React
  server/
    index.js          # API Express
    db.js             # conexion y bootstrap
    sql/
      init.sql        # esquema inicial
  docs/
    database-structure.md
  docker-compose.yml
```

Eso ya es un monorepo pequeño y suficiente para esta etapa. No necesitas separar repositorio de frontend y backend todavía.
