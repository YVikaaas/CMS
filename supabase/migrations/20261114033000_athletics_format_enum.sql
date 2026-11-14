-- Athletics fixture formats. Separate from the rest of the athletics
-- migration so the new enum values are committed before use.

alter type public.fixture_format_type add value if not exists 'track_rounds';
alter type public.fixture_format_type add value if not exists 'field_attempts';
