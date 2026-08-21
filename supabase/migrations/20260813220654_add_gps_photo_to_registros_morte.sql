ALTER TABLE registros_morte
  ADD COLUMN latitude double precision,
  ADD COLUMN longitude double precision,
  ADD COLUMN gps_accuracy double precision,
  ADD COLUMN foto_url text;;
