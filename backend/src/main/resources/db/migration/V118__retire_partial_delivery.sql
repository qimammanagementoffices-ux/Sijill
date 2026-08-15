-- A delivery now closes the request in one pass: issuing less than approved
-- is recorded as a shortfall against that delivery instead of leaving the
-- request open for a second handover. PARTIALLY_DELIVERED and the
-- "تسليم المتبقي" / write-off actions that existed to resolve it are gone.
--
-- Any request currently sitting in that status has already had its goods
-- handed over; it was only waiting on a remainder nobody is going to deliver
-- now. Move it to DELIVERED so the requester can confirm receipt, which is
-- the same place the write-off action used to leave it.

update need_request
set status = 'DELIVERED'
where status = 'PARTIALLY_DELIVERED';

-- The card labels for the two retired actions. Left in place for history:
-- requests decided earlier still carry CANCEL_REMAINDER rows in their action
-- log, and the timeline has to be able to name them.
delete from translation where key = 'requestActions.deliverRemainder';
delete from translation where key = 'requestStatus.PARTIALLY_DELIVERED';
