-- Make occurrence_date and occurrence_time nullable to allow public form submissions
ALTER TABLE public.complaints 
ALTER COLUMN occurrence_date DROP NOT NULL,
ALTER COLUMN occurrence_time DROP NOT NULL;

-- Also update the validation trigger to handle optional date/time fields
CREATE OR REPLACE FUNCTION public.validate_complaint_input()
RETURNS TRIGGER AS $$
BEGIN
  -- Sanitize and validate phone number
  NEW.complainant_phone = regexp_replace(NEW.complainant_phone, '[^0-9+()\s-]', '', 'g');
  
  -- Validate required fields are not empty after trimming
  IF trim(NEW.complainant_name) = '' THEN
    RAISE EXCEPTION 'Complainant name cannot be empty';
  END IF;
  
  IF trim(NEW.narrative) = '' THEN
    RAISE EXCEPTION 'Narrative cannot be empty';
  END IF;
  
  -- Trim whitespace from text fields
  NEW.complainant_name = trim(NEW.complainant_name);
  NEW.complainant_address = trim(NEW.complainant_address);
  NEW.occurrence_address = trim(NEW.occurrence_address);
  NEW.narrative = trim(NEW.narrative);
  
  -- Limit narrative length
  IF length(NEW.narrative) > 5000 THEN
    RAISE EXCEPTION 'Narrative too long (max 5000 characters)';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;