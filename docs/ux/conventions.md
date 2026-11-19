# UX Conventions

Rules here are mandatory for any component they apply to. If a rule
must be broken, ask first; do not silently deviate.

Each rule has an ID (e.g. UX-LOGIN-01). Reference IDs in PR
descriptions and reviews. When adding new rules, keep the same format:
ID, one short imperative sentence, scoped by an "Applies to" line.

## Login Page

**Applies to:** the login page and any component that re-authenticates
a user with username + password.

### Remembered username
- **UX-LOGIN-01**: If a previously logged-in user's username is stored,
  pre-fill the username field with it on page load.
- **UX-LOGIN-02**: The pre-filled username must remain editable. It must
  never be read-only or disabled.

### Initial focus
- **UX-LOGIN-03**: If the username field is pre-filled, autofocus the
  password field.
- **UX-LOGIN-04**: If the username field is empty, autofocus the
  username field.

### Enter key behavior
- **UX-LOGIN-05**: Pressing Enter in the username field moves focus to
  the password field. It must not submit the form.
- **UX-LOGIN-06**: Pressing Enter in the password field triggers the
  same action as clicking the login button (submit the form).

### Keyboard navigation
- **UX-LOGIN-07**: ArrowDown in the username field moves focus to the
  password field; ArrowUp in the password field moves focus to the
  username field.
- **UX-LOGIN-08**: The whole login flow must be completable with the
  keyboard alone, without a mouse.

### Acceptance checklist
- [ ] Stored username present: password field focused on load
- [ ] No stored username: username field focused on load
- [ ] Enter in username: focus moves to password, no submit
- [ ] Enter in password: login submitted
- [ ] Arrow Up/Down switch between the two fields
- [ ] Pre-filled username can be edited
