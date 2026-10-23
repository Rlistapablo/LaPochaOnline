ALTER TABLE rooms DROP CONSTRAINT IF EXISTS rooms_status_check;
ALTER TABLE rooms ADD CONSTRAINT rooms_status_check CHECK(status IN ('lobby','exchange','reveal','bid','play','roundEnd','finished'));
