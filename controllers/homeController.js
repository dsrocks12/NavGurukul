// controllers/homeController.js
exports.index = (req, res) => {
    res.render('index', { request: req });
  };
  
  exports.blog = (req, res) => {
    res.render('blog', { request: req });
  };
  