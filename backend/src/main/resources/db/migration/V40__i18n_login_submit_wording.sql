-- Reference site's login button reads "تحقق ودخول" (verify & sign in), not
-- plain "دخول" -- match it.
update translation set value_ar = 'تحقق ودخول' where key = 'login.submit';
