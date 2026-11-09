/**
 * Rebuild HeavenTech "Member feedback" - short, clean, members first.
 * Plain ASCII only. script.google.com -> paste -> Run buildFeedbackForm.
 */
var FORM_ID = '1EEhwANAlHQWECAsK6kyJAYC9JleX5ZR4Tw27TCYId8E';

function buildFeedbackForm() {
  var form = FormApp.openById(FORM_ID);

  form.setTitle('Member feedback');
  form.setDescription(
    'For members (and anyone helping). Tell us what is broken, confusing, or missing.\n' +
      'Do not write passwords or other people\'s private details.\n' +
      'One clear note is enough. Thank you.'
  );
  form.setCollectEmail(false);
  form.setLimitOneResponsePerUser(false);
  form.setAllowResponseEdits(true);
  form.setProgressBar(true);
  form.setShuffleQuestions(false);
  form.setConfirmationMessage(
    'Thank you - your note is in.\n' +
      'We will never ask for a password through this form.'
  );

  var existing = form.getItems();
  for (var i = existing.length - 1; i >= 0; i--) {
    form.deleteItem(existing[i]);
  }

  // --- About you ---
  form
    .addSectionHeaderItem()
    .setTitle('About you')
    .setHelpText('So we know who this is from, and how we may share it.');

  form
    .addListItem()
    .setTitle('Who are you?')
    .setChoiceValues([
      'Member',
      'Cell leader',
      'Helper / volunteer',
      'Admin',
      'Guest',
      'Prefer not to say',
    ])
    .setRequired(true);

  form
    .addListItem()
    .setTitle('If we share this in the group chat, how may we name you?')
    .setChoiceValues([
      'Use my first name (type it below)',
      'Say my role only (e.g. "a member")',
      'Keep me anonymous',
    ])
    .setRequired(true);

  form
    .addTextItem()
    .setTitle('First name')
    .setHelpText('Only if you chose "Use my first name".')
    .setRequired(false);

  form
    .addListItem()
    .setTitle('Which app?')
    .setChoiceValues(['Gather', 'Other', 'Not sure'])
    .setRequired(true);

  // --- Your note ---
  form
    .addPageBreakItem()
    .setTitle('Your note')
    .setHelpText('Keep it short.');

  form
    .addMultipleChoiceItem()
    .setTitle('What is this?')
    .setChoiceValues([
      'Something broken',
      'Confusing or hard to use',
      'Something missing',
      'Idea for later',
      'Praise - please keep this',
    ])
    .setRequired(true);

  form
    .addMultipleChoiceItem()
    .setTitle('How urgent for you?')
    .setChoiceValues([
      'Blocks me now',
      'Annoying - I have a workaround',
      'Nice to have',
      'Just noticing',
    ])
    .setRequired(true);

  form
    .addListItem()
    .setTitle('Which part of the app?')
    .setChoiceValues([
      'Sign-in / account',
      'Home / browse / search',
      'Calendar',
      'Event page / Attend',
      'My bookings',
      'Phone layout / look and feel',
      'Members / import',
      'Pending review',
      'Other / several places',
    ])
    .setRequired(true);

  form
    .addParagraphTextItem()
    .setTitle('What happened (or what do you want)?')
    .setHelpText('One or two sentences. Try: "I expected ... but ..."')
    .setRequired(true);

  form
    .addMultipleChoiceItem()
    .setTitle('Could this confuse or show private member data?')
    .setChoiceValues(['No', 'Maybe', 'Yes'])
    .setRequired(true);

  // --- Share ---
  form
    .addPageBreakItem()
    .setTitle('Sharing')
    .setHelpText('We follow your naming choice from earlier.');

  form
    .addMultipleChoiceItem()
    .setTitle('OK to share this note in the usual group chat?')
    .setChoiceValues([
      'Yes',
      'Yes - but keep my name off it',
      'No - keep private to An / Guillaume only',
    ])
    .setRequired(true);

  form
    .addTextItem()
    .setTitle('Contact (optional)')
    .setHelpText('Telegram, email, or WhatsApp - only if you want a reply.')
    .setRequired(false);

  Logger.log('Built form: ' + form.getEditUrl());
  Logger.log('Published view: ' + form.getPublishedUrl());
}
