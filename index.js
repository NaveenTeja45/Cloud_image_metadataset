var express = require('express');
var mongoose = require('mongoose');
var app=express();
var bodyparser=require('body-parser');
app.use(bodyparser.urlencoded({extended:true}));
app.use(bodyparser.json());
var multer=require('multer');
var ejs = require('ejs');
var path = require('path');
var ExifImage = require('exif').ExifImage;


var ImageData = require('./imageData')
var pic = require('./pic');
var Item = require('./Item');


app.set('view engine','ejs');
app.use(express.static('./pictures'));
// Connect to MongoDB
const options = {
autoIndex: false, // Don't build indexes
reconnectTries: 30, // Retry up to 30 times
reconnectInterval: 500, // Reconnect every 500ms
poolSize: 10, // Maintain up to 10 socket connections
// If not connected, return errors immediately rather than waiting for reconnect
bufferMaxEntries: 0
}

const connectWithRetry = () => {
console.log('MongoDB connection with retry')
mongoose.connect("mongodb://mongo:27017/docker-node-mongo", options).then(() => {
	console.log('MongoDB is connected')
}).catch(err => {
	console.log(err)
	console.log('MongoDB connection unsuccessful, retry after 5 seconds.')
	setTimeout(connectWithRetry, 5000)
})
}

connectWithRetry()



var Storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, path.join(__dirname, './pictures'))
    },
    filename: function(req, file, cb) {
        var fileName = file.fieldname + '-' + Date.now() + path.extname(file.originalname);
        try {
            //console.log("entered");
            new ExifImage({ image: path.join('pictures', fileName) }, function(error, exifData) {
                if (error) {
                    console.log('Error: ' + error.message);
                } else {
                    //console.log(exifData); // Do something with your data!
                    exifData.path = path.join('pictures', fileName);
                    //console.log(exifData);
                    var newImage = new ImageData(exifData);
                    newImage.save().then(item => res.sendFile(__dirname+'/upload.html'));
                }

                //console.log('here')
            });
        } catch (error) {
            console.log('Error: ' + error.message);
        }
        cb(null, fileName);
    }
});

var upload = multer({
	storage:Storage,
	limits:{fileSize:1000000},
	fileFilter:function(req,file,cb){
		checkFileType(file,cb);
	}
}).single('myimage')

function checkFileType(file,cb){
	var filetypes = /jpeg|jpg/;
	var extname=filetypes.test(path.extname(file.originalname).toLowerCase());
	var mimetype = filetypes.test(file.mimetype);

	if(mimetype && extname){
		return cb(null,true);
	}
	else
	{
		cb('Error : Images Only!');
	}

}

app.post('/upload',function(req,res){
	upload(req,res,(err)=>{
		if(err){
			console.log('error occured bro '+err);
			res.sendFile(__dirname+'/upload.html');
		}
		else
		{
			console.log(req.file);
			res.redirect('/upload.html');
		}
	})
})

app.post('/search', (req, res) => {
    ImageData.find({}, function(err, docs) {
        if (err) { res.json(err); } else {
            var name1 = req.body.name1;
            var name2 = req.body.name2;
            var prop = req.body.prop;
            var result = [];
            var i = 0;
            if (name2 == "") {
                docs.forEach((doc) => {
                    var ob = JSON.parse(JSON.stringify(doc));
                    if (ob[name1] == prop) {
						console.log(String(ob['path'])+" name2 is null");
                        result.push(String(ob['path']).substring(8));
                    }
                });
                console.log(result);
            } else {
                docs.forEach((doc) => {
                    var ob = JSON.parse(JSON.stringify(doc));
                    if (ob[name1][name2] == prop) {
                        result.push(String(ob['path']).substring(8));
                    }
                });
                console.log(result);
            }
            //console.log(JSON.parse(JSON.stringify(docs[0]))['path']);
            res.render('list', { items: result, layout: false });
        }
    });
});;

app.get('/',function(req,res)
{
	res.sendFile(__dirname+'/index.html');
})


app.post('/login',function(req,res,next){
	Item.count({ name: req.body.name2, password: req.body.pass2 }, function(err, count) {
		if (count > 0) {
			//document exists });
			return res.redirect('/upload.html');
		} else {
			var msgTop = 'Wrong Credentials';
			var msg = '';
			return res.redirect('/')
		}
	});
})

app.post('/insert',function(req,res,next){
	var newItem = new Item({
		name: req.body.name1,
		password: req.body.pass1
	  });
	  newItem.save().then(item =>
		res.redirect('/'));
})

app.get('/upload.html',function(req,res){

	res.sendFile(__dirname+'/upload.html');
})

app.get('/help.png',function(req,res){

	res.sendFile(__dirname+'/help.png');
})


app.get('/style.css',function(req,res){
	res.sendFile(__dirname+'/style.css');
})

app.listen('3000',()=>
{
	console.log('Server is running on 3000');
});


