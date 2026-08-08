-- LoginForm.tsx was showing the backend's raw (English-only) error message
-- for a rate-limited login attempt, same bug as the invalid-credentials
-- case it's fixed alongside (see decision-record.md / commit message).
insert into translation (key, value_ar, value_en, value_hi) values
    ('login.rateLimited', 'محاولات كثيرة جدًا. حاول مرة أخرى لاحقًا.', 'Too many attempts. Try again later.', 'बहुत सारे प्रयास। कृपया बाद में पुनः प्रयास करें।');
