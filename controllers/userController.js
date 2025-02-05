const { User } = require('../models');

exports.updateUsername = async (req, res) => {
  const { userId, username } = req.body;
  console.log("Received request to update username:", userId, username);
  try {
    await User.update(
      { username },
      { where: { id: userId } }
    );
    res.status(200).json({ success: true, username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Error updating username' });
  }
};

exports.getRoom = async (req, res) => {
  const { room } = req.params;
  const { userId } = req.query;

  if (!userId) return res.redirect('/');

  try {
    const user = await User.findOne({ where: { id: userId } });
    if (!user) return res.redirect('/');
    res.render('room', { roomId: room, userId, username: user.username });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
};
