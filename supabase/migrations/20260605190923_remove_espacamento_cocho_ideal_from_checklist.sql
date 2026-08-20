UPDATE registros_suplementacao 
SET checklist = checklist - 'espacamento_cocho_ideal'
WHERE checklist ? 'espacamento_cocho_ideal';;
