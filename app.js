// Load environment variables from .env file
require('dotenv').config();
// Import required modules
const express = require("express");
const request = require('request');
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
const _ = require("lodash");
const path = require('path');
const mime = require('mime');
const multer = require('multer');
const shortid = require('shortid');
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const pdf = require('html-pdf');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const passport = require("passport");
const flash = require('connect-flash');
const LocalStrategy = require("passport-local");
const passportLocalMongoose = require("passport-local-mongoose");
const {isAuthenticated} = require("passport/lib/http/request");
const {EventEmitter} = require('events');


// Create express application
const app = express();

// Set the view engine to EJS
app.set('view engine', 'ejs');

// Middleware for parsing request bodies
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

// Serve static files from the "uploads" and "public" directories
app.use(express.static("uploads"));
app.use(express.static("public"));

// Set the views directory to "./views"
app.set('views', path.join(__dirname, 'views'));

// Configure EJS options
ejs.localsName = 'locals';
ejs.partials = {
    header: 'partials/header',
    footer: 'partials/footer'
};

// Middleware for parsing cookies
app.use(cookieParser());

// Serve static files for fonts, CSS, and bundles
app.use('/fonts', express.static(path.join(__dirname, 'public/css/fonts'), {
    setHeaders: (res, filePath) => {
        res.setHeader('Content-Type', mime.getType(filePath));
    }
}));
app.use('/css', express.static(path.join(__dirname, 'public/css'), {
    setHeaders: (res, filePath) => {
        res.setHeader('Content-Type', mime.getType(filePath));
    }
}));
app.use('/bundles', express.static(path.join(__dirname, 'public/bundles'), {
    setHeaders: function (res, path) {
        if (path.endsWith('.js')) {
            res.set('Content-Type', mime.getType(path));
        }
    }
}));

// Configure multer storage and file filter
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, __dirname + '/uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname)
    }
});
const fileFilter = function (req, file, cb) {
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};

// Create multer upload middleware
const upload = multer({storage: storage, fileFilter: fileFilter});

// Custom middleware for handling requests
app.use(async function (req, res, next) {
    try {
        // Variables for storing last uploaded photos
        let lastUploadedDoctorPhoto;
        let lastUploadedClinicPhoto;

        // Retrieve last uploaded doctor photo
        const doctorPhotodocs = await DoctorPhoto.find({}).sort({_id: -1}).limit(1).exec();
        if (doctorPhotodocs.length > 0) {
            lastUploadedDoctorPhoto = path.basename(doctorPhotodocs[0].doctorPhoto);
        }

        // Retrieve last uploaded clinic photo
        const clinicPhotodocs = await ClinicPhoto.find({}).sort({_id: -1}).limit(1).exec();
        if (clinicPhotodocs.length > 0) {
            lastUploadedClinicPhoto = path.basename(clinicPhotodocs[0].clinicPhoto);
        }

        // Retrieve necessary data from various collections
        const [
            patients,
            invoices,
            doctor,
            clinic,
            settingSocialMedia,
            userPreferences,
            drugs,
            reviews,
            todos,
            contacts
        ] = await Promise.all([
            Patient.find({}).exec(),
            Invoice.find({}).exec(),
            Doctor.find({}).exec(),
            Clinic.find({}).exec(),
            SettingSocialMedia.find({}).exec(),
            UserPreferences.find({}).exec(),
            Drug.find({}).exec(),
            Review.find({}).exec(),
            Todo.find({}).exec(),
            Contact.find({}).exec(),
        ]);

        // Get the language preference from user preferences or default to 'en'
        const language = (userPreferences[0] ?? {}).language || 'en';

        // Path to translation file
        const translationFilePath = path.join(__dirname, 'locales', language, 'translation.json');

        // Read translation file
        fs.readFile(translationFilePath, 'utf8', (err, data) => {
            if (err) {
                console.error('Error handling translation file:', err);
            } else {
                const translationFile = JSON.parse(data);

                // Set locals for rendering views
                res.locals = {
                    lastUploadedDoctorPhoto: encodeURIComponent(lastUploadedDoctorPhoto),
                    lastUploadedClinicPhoto: encodeURIComponent(lastUploadedClinicPhoto),
                    patients: patients.length > 0 ? patients : [],
                    invoices: invoices.length > 0 ? invoices : [],
                    doctor: doctor.length > 0 ? doctor[0] : null,
                    clinic: clinic.length > 0 ? clinic[0] : null,
                    settingSocialMedia: settingSocialMedia.length > 0 ? settingSocialMedia[0] : null,
                    userPrefrences: userPreferences[0],
                    drugs: drugs.length > 0 ? drugs : [],
                    contacts: contacts.length > 0 ? contacts : [],
                    reviews: reviews.length > 0 ? reviews : [],
                    todos: todos.length > 0 ? todos : [],
                    translation: translationFile // Add the translationFile to res.locals
                };

                next();
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});


//this code sets up the necessary schemas and models for a MongoDB database using Mongoose, to interact with the database and perform CRUD operations on the defined collections.
mongoose.set('strictQuery', false);
mongoose.connect("mongodb://127.0.0.1:27017/clinicDB", {useNewUrlParser: true, useUnifiedTopology: true})
    .then(() => {
        console.log('Connected to MongoDB');
    })
    .catch((err) => {
        console.error('Error connecting to MongoDB', err);
    });

const eventEmitter = new EventEmitter();
const contactEventEmitter = new EventEmitter();
const contactEmitter = new EventEmitter();


const appointmentSchema = {
    idNumber: String,
    fName: String,
    lName: String,
    dateOfBirth: String,
    gender: String,
    service: String,
    date: String,
    time: String,
    email: String,
    tel: String,
    paragraph: String,

}
const Appointment = mongoose.model("appointment", appointmentSchema);


const approvedAppointmentSchema = {
    idNumber: String,
    fName: String,
    lName: String,
    service: String,
    date: String,
    time: String,
    tel: String,
}
const ApprovedAppointment = mongoose.model("ApprovedAppointment", approvedAppointmentSchema);


const deletedAppointmentSchema = {
    idNumber: String,
    fName: String,
    lName: String,
    service: String,
    date: String,
    time: String,
    tel: String,
}
const DeletedAppointment = mongoose.model("deletedAppointment", deletedAppointmentSchema);


const drugSchema = {
    idNumber: String,
    drugName: String,
    category: String,
    companyName: String,
    purchaseDate: Date,
    expiredDate: Date,
    price: String,
    expense: Number,
    stock: Number,
    description: String,
    employeeName: String,
    thePriceOfTheQuantityPurchased: Number,
}
const Drug = mongoose.model('drug', drugSchema);


const invoiceItemSchema = new mongoose.Schema({
    itemName: {type: String},
    description: {type: String},
    unitCost: {type: Number},
    quantity: {type: Number},
    total: {
        type: Number,
        get: function () {
            return this.unitCost * this.quantity;
        },
        set: function (total) {
            return this.total;
        },
    },
});
const InvoiceItem = mongoose.model('invoiceItem', invoiceItemSchema);


const invoiceSchema = {
    fullName: {type: String},
    email: {type: String},
    invoiceId: {type: String},
    status: {type: String},
    invoiceDate: {type: String},
    termsAndConditions: {type: String},
    items: [invoiceItemSchema],
    totalPrice: {type: Number},
    amountPaid: {type: Number},
    due: {type: Number},
    terms: {type: String},
}
const Invoice = mongoose.model('invoice', invoiceSchema);


const lastVisitSchema = {
    patientId: String,
    date: String,
    time: String,
    note: String,
    reason: String
};
const LastVisit = mongoose.model('lastVisit', lastVisitSchema);


const patientSchema = {
    idNumber: String,
    fName: String,
    lName: String,
    disease: String,
    tel: String,
    dateOfBirth: Date,
    age: String,
    time: String,
    gender: String,
    email: String,
    adress: String,
    note: String,
    lastVisit: [lastVisitSchema],
    status: String,
    diseaseHistory: Array,
    weight: String,
    height: String,
    invoices: [{type: mongoose.Schema.Types.ObjectId, ref: 'invoice'}],
    dominantHand: Boolean,
    xRays: Boolean,
    primaryPhysicianName: String,
    clinicName: String,
    latexAllergy: Boolean,
    body_part: {
        rightShoulder: {type: Boolean, default: false},
        leftShoulder: {type: Boolean, default: false},
        rightElbow: {type: Boolean, default: false},
        leftElbow: {type: Boolean, default: false},
        rightWrist: {type: Boolean, default: false},
        leftWrist: {type: Boolean, default: false},
        rightHand: {type: Boolean, default: false},
        leftHand: {type: Boolean, default: false},
        rightKnee: {type: Boolean, default: false},
        leftKnee: {type: Boolean, default: false},
        rightAnkle: {type: Boolean, default: false},
        leftAnkle: {type: Boolean, default: false},
        rightFoot: {type: Boolean, default: false},
        leftFoot: {type: Boolean, default: false},
        neck: {type: Boolean, default: false},
        back: {type: Boolean, default: false},
    },
    howLongAgoDidItStart: {
        days: String,
        weeks: String,
        months: String,
        years: String,
    },
    haveYouHadAProblemLikeThisBefore: Boolean,
    injuries: {
        main_group: {
            type: String,
            enum: ["NO INJURY", "INJURY", "INJURY AT WORK", "WORK RELATED", "AUTO ACCIDENT"]
        },
        nested_group_1: {
            input_type: {
                type: String,
                enum: ["gradual", "sudden", "accident", "sport", "lift", "twist", "fall", "bend", "pull", "reach"]
            },
            additional_inputs: {
                sport_input: {
                    type: String
                },
                school_input: {
                    type: String
                },
                date_input1: {
                    type: Date,
                    format: "date"
                },
                date_input2: {
                    type: Date,
                    format: "date"
                },
                date_input3: {
                    type: Date,
                    format: "date"
                },
                date_input4: {
                    type: Date,
                    format: "date"
                },
                comment_input: {
                    type: String
                }
            }
        }
    },
    painRating: {
        type: Number,
        min: 1,
        max: 10
    },
    quality: {
        sharp: {type: Boolean, default: false},
        dull: {type: Boolean, default: false},
        stabbing: {type: Boolean, default: false},
        throbbing: {type: Boolean, default: false},
        aching: {type: Boolean, default: false},
        burning: {type: Boolean, default: false}
    },
    thePainIs: {type: String, enum: ['Constant', 'Comes and goes (intermittent)']},
    wakeYou: {type: Boolean, default: false},
    symptoms: {
        swelling: {
            type: Boolean,
            default: false
        },
        bruises: {
            type: Boolean,
            default: false
        },
        numbness: {
            type: Boolean,
            default: false
        },
        tingling: {
            type: Boolean,
            default: false
        },
        weakness: {
            type: Boolean,
            default: false
        },
        givingWay: {
            type: Boolean,
            default: false
        },
        lockingCatching: {
            type: Boolean,
            default: false
        },
        heartburn: {type: Boolean},
        nausea: {type: Boolean, default: false},
        bloodInStool: {type: Boolean, default: false},
        liverDisease: {type: Boolean, default: false},
        thyroidDisease: {type: Boolean, default: false},
        heatOrColdIntolerance: {type: Boolean, default: false},
        weightLoss: {type: Boolean, default: false},
        lossOfAppetite: {type: Boolean, default: false},
        kidneyProblems: {type: Boolean, default: false},
        easyBruising: {type: Boolean, default: false},
        troubleSwallowing: {type: Boolean, default: false},
        blurredVision: {type: Boolean, default: false},
        doubleVision: {type: Boolean, default: false},
        visionLoss: {type: Boolean, default: false},
        hearingLoss: {type: Boolean, default: false},
        hoarseness: {type: Boolean, default: false},
        chestPain: {type: Boolean, default: false},
        palpitations: {type: Boolean, default: false},
        chronicCough: {type: Boolean, default: false},
        shortnessOfBreath: {type: Boolean, default: false},
        painfulUrination: {type: Boolean, default: false},
        bloodInUrine: {type: Boolean, default: false},
        frequentRashes: {type: Boolean, default: false},
        lumps: {type: Boolean, default: false},
        skinUlcers: {type: Boolean, default: false},
        psoriasis: {type: Boolean, default: false},
        headaches: {type: Boolean, default: false},
        dizziness: {type: Boolean, default: false},
        seizures: {type: Boolean, default: false},
        depression: {type: Boolean, default: false},
        drugAlcoholAddiction: {type: Boolean, default: false},
        sleepDisorder: {type: Boolean, default: false},
        easyBleeding: {type: Boolean, default: false},
        anemia: {type: Boolean, default: false},
        year1: {type: String, default: ''},
        year2: {type: String, default: ''},
        year3: {type: String, default: ''},
        year4: {type: String, default: ''},
        year5: {type: String, default: ''},
        year6: {type: String, default: ''},
        year7: {type: String, default: ''},
        year8: {type: String, default: ''},
        year9: {type: String, default: ''},
        year10: {type: String, default: ''},
        year11: {type: String, default: ''},
        year12: {type: String, default: ''},
        symptomsDescribe: {type: String, default: ''},
        smokingRisk: {type: Boolean},
        gettingBetter: {type: Boolean, default: false},
        gettingWorse: {type: Boolean, default: false},
        unchanged: {type: Boolean, default: false},
        standing: {type: Boolean, default: false},
        walking: {type: Boolean, default: false},
        lifting: {type: Boolean, default: false},
        exercise: {type: Boolean, default: false},
        twisting: {type: Boolean, default: false},
        lyingInBed: {type: Boolean, default: false},
        bending: {type: Boolean, default: false},
        squatting: {type: Boolean, default: false},
        kneeling: {type: Boolean, default: false},
        stairs: {type: Boolean, default: false},
        sitting: {type: Boolean, default: false},
        coughing: {type: Boolean, default: false},
        sneezing: {type: Boolean, default: false},
        restt: {type: Boolean, default: false},
        elevation: {type: Boolean, default: false},
        heat: {type: Boolean, default: false},
        ice: {type: Boolean, default: false},
        mri: {
            type: Boolean
        },
        catScan: {
            type: Boolean
        },
        boneScan: {
            type: Boolean
        },
        nerveTest: {
            type: Boolean
        },
        insulin: {type: Boolean, default: false},
        oralMeds: {type: Boolean, default: false},
        diet: {type: Boolean, default: false},
        heartAttack: {type: Boolean, default: false},
        highBloodPressure: {type: Boolean, default: false},
        bloodClots: {type: Boolean, default: false},
        stroke: {type: Boolean, default: false},
        heartFailure: {type: Boolean, default: false},
        ankleSwelling: {type: Boolean, default: false},
        kidneyfailure: {type: Boolean, default: false},
        cancer: {type: Boolean, default: false},
        stomachache: {type: Boolean, default: false},
        iDoNotHaveAny: {type: Boolean, default: false},
        directRelativesDiabetes: {type: Boolean, default: false},
        directRelativesHighBloodPressure: {type: Boolean, default: false},
        directRelativesRheumatoidArthritis: {type: Boolean, default: false},
        student: {type: Boolean, default: false},
    },
    other: {type: String, default: null},
    treatment: {
        injection: {type: Boolean},
        brace: {type: Boolean},
        physicalTherapy: {type: Boolean},
        caneCrutch: {type: Boolean}
    },
    medications: {type: String},
    allergicToMedic: {type: Boolean, default: false},
    reaction: {type: String},
    seenInTheER: {
        type: Boolean,
    },
    whichER: {
        type: String
    },
    erVisit: {
        type: Boolean,
    },
    whoSawYouInER: {
        type: String
    },
    // xRays: {
    //     type: Boolean
    // },
    otherScan: {
        type: String
    },
    hadSurgery: {
        type: Boolean,
    },
    procedure1: {
        type: String
    },
    surgeon1: {
        type: String
    },
    city1: {
        type: String
    },
    date1: {
        type: Date
    },
    procedure2: {
        type: String
    },
    surgeon2: {
        type: String
    },
    city2: {
        type: String
    },
    date2: {
        type: Date
    },
    lastWorkDate: {type: Date},
    priorProblem: {
        hasPriorProblem: {type: Boolean},
        description: {type: String, default: ''}
    },
    otherJoints: {
        morningStiffness: {type: Boolean, default: false},
        jointPain: {type: Boolean, default: false},
        backPain: {type: Boolean, default: false},
        gout: {type: Boolean, default: false},
        rheumatoidArthritis: {type: Boolean, default: false},
        priorFracture: {type: Boolean, default: false},
        priorFractureBone: {type: String, default: ''}
    },
    workStatus: {
        regular: {type: Boolean, default: false},
        lightDuty: {type: Boolean, default: false},
        notWorking: {type: Boolean, default: false},
        disabled: {type: Boolean, default: false},
        retired: {type: Boolean, default: false},
        isStudent: {type: Boolean, default: false}
    },
    lastWorkDate: {type: Date},
    priorProblem: {
        hasPriorProblem: {type: Boolean, default: false},
        description: {type: String, default: ''}
    },
    otherJoints: {
        morningStiffness: {type: Boolean, default: false},
        jointPain: {type: Boolean, default: false},
        backPain: {type: Boolean, default: false},
        gout: {type: Boolean, default: false},
        rheumatoidArthritis: {type: Boolean, default: false},
        priorFracture: {type: Boolean, default: false},
        priorFractureBone: {type: String, default: ''}
    },
    hivPositive: {type: Boolean},
    diabetic: {type: Boolean},
    dietNone: {type: Boolean, default: false},
    bloodThinners: {type: Boolean},
    whichOne: {
        type: String
    },
    pastSurgicalHistory: {
        type: String
    },
    anesthesia: {type: Boolean},
    anesthesiaExplain: {
        type: String
    },
    hospitalizations: {
        type: String
    },
    heartAttackYear: {type: String, default: ''},
    bloodClotsYear: {type: String, default: ''},
    cancerlocation: {type: String, default: null},
    antiInflammatories: {type: String, default: null},
    directRelatives: {type: String, default: null},
    sameCondition: {type: Boolean},
    tobacco: Boolean,
    packsPerDay: {type: String, default: null},
    alcoholUse: Boolean,
    daily: {type: Boolean, default: false},
    alcoholPerWeek: {type: String, default: null},
    maritalStatus: String,
    peopleLiveWith: {type: String, default: null},
    maritalHistory: {type: String, default: null},
    occupation: {type: String, default: null},
    employer: {type: String, default: null},
    workingPlan: Boolean,

}
const Patient = mongoose.model('patient', patientSchema);



const doctorSchema = new mongoose.Schema({
    idNumber: {
        type: String
    },
    fName: {
        type: String
    },
    lName: {
        type: String
    },
    password: {
        type: String
    },
    email: {
        type: String,
        unique: true
    },
    tel: {
        type: String
    },
    company: {
        type: String
    },
    companyWebsite: {
        type: String
    },
    specialty: {
        type: String
    },
    experience: {
        type: String
    },
    // doctorPhoto: {
    //     type: String
    // },
    address: {
        street: {
            type: String
        },
        city: {
            type: String
        },
        state: {
            type: String
        },
        zipCode: {
            type: String
        },
        country: {
            type: String
        },
        timeZone: {
            type: String
        }
    },
    reviews: [
        {
            title: {
                type: String
            },
            description: {
                type: String
            },
            rating: {
                type: Number
            },
            reviewerName: {
                type: String
            },
            reviewerEmail: {
                type: String
            }
        }
    ],
    schedule: [
        {
            day: {
                type: String,
                enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
            },
            startTime: {
                type: String
            },
            endTime: {
                type: String
            }
        }
    ],
    appointments: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Appointment'
        }
    ],
    clinic: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Clinic'
    }
});
const Doctor = mongoose.model('Doctor', doctorSchema);


const todoSchema = new mongoose.Schema({
    text: {
        type: String,
        required: true
    },
    done: {
        type: Boolean,
        default: false
    }
});
const Todo = mongoose.model('Todo', todoSchema);


const authenticationSchema = new mongoose.Schema({
    username: {
        type: String
    },
    password: {
        type: String
    }
});

authenticationSchema.plugin(passportLocalMongoose);
const Authentication = mongoose.model('Authentication', authenticationSchema);



// Configure Passport to use the LocalStrategy for authentication
passport.use(new LocalStrategy(Authentication.authenticate()));

// Serialize the user object into the session
passport.serializeUser(Authentication.serializeUser());

// Deserialize the user object from the session
passport.deserializeUser(Authentication.deserializeUser());


// Set up session management
app.use(session({
    secret: "Our little secret.", // Secret used to sign the session ID cookie
    resave: false, // Whether to save the session on every request, even if it hasn't been modified
    saveUninitialized: false // Whether to save uninitialized sessions to the store
}));

// Initialize Passport authentication
app.use(passport.initialize());

// Enable persistent login sessions with Passport
app.use(passport.session());

// Enable flash messages
app.use(flash());

// Serialize the user object into the session
passport.serializeUser(function (doctor, done) {
    done(null, doctor.id);
});

// Deserialize the user object from the session
passport.deserializeUser(function (id, done) {
    Doctor.findById(id, function (err, doctor) {
        done(err, doctor);
    });
});


//Defining other schemas
const clinicSchema = {
    idNumber: {
        type: String
    },
    name: {
        type: String
    },
    address: {
        type: String
    },
    email: {
        type: String
    },
    phone: {
        type: String
    },
    state: {
        type: String
    },
    city: {
        type: String
    },
    clinicType: {
        type: String
    },
    clinicMessage: {
        type: String
    },
    // clinicLogo: {
    //     type: String
    // },
    altEmail: {
        type: String
    },
    password: {
        type: String
    },
    userName: {
        type: String
    },
    registrationEmail: {
        type: String
    },
    doctors: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Doctor'
        }
    ],
    appointments: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Appointment'
        }
    ]
}
const Clinic = mongoose.model('clinic', clinicSchema);

const settingSocialMediaSchema = new mongoose.Schema({
    socialMedia: {
        facebook: {
            type: String
        },
        twitter: {
            type: String
        },
        linkedIn: {
            type: String
        }
    }
});
const SettingSocialMedia = mongoose.model('SettingSocialMedia', settingSocialMediaSchema);

const doctorPhotoSchema = {
    doctorPhoto: {
        type: String
    }
}
const DoctorPhoto = mongoose.model('doctorPhoto', doctorPhotoSchema);

const clinicPhotoSchema = {
    clinicPhoto: {
        type: String
    }
}
const ClinicPhoto = mongoose.model('clinicPhoto', clinicPhotoSchema);

const userPreferencesSchema = new mongoose.Schema({
    language: {
        type: String,
        default: 'en' // Default language
    },
    theme: {type: String},
    themeValue: {type: String},
    themeRtl: {type: Boolean},
    sidebarMini: {type: Boolean},
    font: {type: String},
    h_menu: {type: Boolean},
    headerFixed: {type: Boolean},
    headerDarkMode: {type: Boolean},
    borderRadios: {type: Number},
    sidebarDark: {type: Boolean},
    checkImage: {type: Boolean},
    pic: {type: String},
    fluidLayout: {
        type: Boolean,
        default: true,
    },
    cardShadow: {type: Boolean},
}, {timestamps: true});
const UserPreferences = mongoose.model('UserPreferences', userPreferencesSchema);

const reviewSchema = new mongoose.Schema({
    rating: {
        type: Number,
        required: true,
    },
    active: {
        type: Boolean,
        default: false
    },
    name: {
        type: String,
        required: true,
    },
    profession: {
        type: String,
        required: true,
    },
    city: {
        type: String,
        required: true,
    },
    review: {
        type: String,
        required: true,
    },
    viewed: {
        type: String,
        default: false,
    },
});
const Review = mongoose.model('Review', reviewSchema);

const contactSchema = new mongoose.Schema({
    contacted: {
        type: Boolean,
        default: false
    },
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    tel: {
        type: String,
        required: true,
    },
    message: {
        type: String,
        required: true,
    },
    viewed: {
        type: String,
        default: false,
    },
});
const Contact = mongoose.model('Contact', contactSchema);


// Render the login page
app.get('/login', (req, res) => {
    res.render('sign-in', { errorMessage: req.flash('error') });
});

/*
// Render the registration page
app.get("/register", function(req, res){
    res.render("register");
});
*/

// Handle the logout request
app.get("/logout", function (req, res) {
    req.logout(function (err) {
        if (err) {
            console.log(err);
        }
        res.redirect("/");
    });
});

// Middleware to ensure user authentication
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect("/login"); // Redirect to the login page if user is not authenticated
}

// Render the dashboard page
app.get("/dashboard", ensureAuthenticated, (req, res) => {
    res.render('index', { currentLanguage: req.language });
});

// Render the landing page
app.get('/', async (req, res) => {
    const hoursList = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

    try {
        const activeReviews = await Review.find({ active: true }).exec();

        // Add stars as a new property to each review object
        const activeReviewsWithStars = activeReviews.map((review) => ({
            ...review.toObject(),
            stars: generateStars(review.rating),
        }));

        const foundAppointments = await Appointment.find({}).exec();
        res.render("landing-page", { hoursList, foundAppointments, activeReviewsWithStars });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server error");
    }
});

app.get('/user/theme', async function (req, res) {
    try {
        // Get user theme preference from database
        const userPrefrences = await UserPreferences.find({}).exec();

        // Send user theme preference as JSON object
        res.json({theme: userPrefrences[0]});
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

// Retrieve an invoice by ID
app.get('/api/invoices/:invoiceID', async (req, res) => {
    try {
        const invoice = await Invoice.findOne({ _id: req.params.invoiceID });
        if (!invoice) {
            res.status(404).json({ message: 'Invoice not found' });
        } else {
            res.status(200).json(invoice);
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Retrieve an appointment by ID
app.get('/api/appointments/:id', async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id).lean().exec();
        res.json(appointment);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Unable to retrieve appointment data' });
    }
});

// Retrieve a drug by ID
app.get('/api/drug/:id', async (req, res) => {
    try {
        const drug = await Drug.findById(req.params.id).lean().exec();
        res.json(drug);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Unable to retrieve drug data' });
    }
});

// Language switch route
app.get('/switch-language/:lang', async (req, res) => {
    try {
        const lang = req.params.lang;

        // Retrieve the user preferences from the database
        const userPreferences = await UserPreferences.findOne();

        // Update the user's language preference in the database
        if (userPreferences) {
            userPreferences.language = lang;
            await userPreferences.save();
        }

        // Redirect back to the dashboard
        res.redirect('/dashboard');
    } catch (error) {
        // Handle any errors that occur while updating the user's language
        console.error('Error updating user language:', error);
        res.redirect('/dashboard');
    }
});

//Rendering account settings
app.get("/account-settings", ensureAuthenticated, async (req, res) => {

    const allTimeZone = [{
        Name: 'Afghanistan',
        Code: 'AF',
        Timezone: 'Afghanistan Standard Time',
        UTC: 'UTC+04:30',
        MobileCode: '+93'
    }, {
        Name: 'Åland Islands',
        Code: 'AX',
        Timezone: 'FLE Standard Time',
        UTC: 'UTC+02:00',
        MobileCode: '+358-18'
    }, {
        Name: 'Albania',
        Code: 'AL',
        Timezone: 'Central Europe Standard Time',
        UTC: 'UTC+01:00',
        MobileCode: '+355'
    }, {
        Name: 'Algeria',
        Code: 'DZ',
        Timezone: 'W. Central Africa Standard Time',
        UTC: 'UTC+01:00',
        MobileCode: '+213'
    }, {
        Name: 'American Samoa',
        Code: 'AS',
        Timezone: 'UTC-11',
        UTC: 'UTC-11:00',
        MobileCode: '+1-684'
    }, {
        Name: 'Andorra',
        Code: 'AD',
        Timezone: 'W. Europe Standard Time',
        UTC: 'UTC+01:00',
        MobileCode: '+376'
    }, {
        Name: 'Angola',
        Code: 'AO',
        Timezone: 'W. Central Africa Standard Time',
        UTC: 'UTC+01:00',
        MobileCode: '+244'
    }, {
        Name: 'Anguilla',
        Code: 'AI',
        Timezone: 'SA Western Standard Time',
        UTC: 'UTC-04:00',
        MobileCode: '+1-264'
    }, {
        Name: 'Antarctica',
        Code: 'AQ',
        Timezone: 'Pacific SA Standard Time',
        UTC: 'UTC-03:00',
        MobileCode: '+'
    }, {
        Name: 'Antigua and Barbuda',
        Code: 'AG',
        Timezone: 'SA Western Standard Time',
        UTC: 'UTC-04:00',
        MobileCode: '+1-268'
    }, {
        Name: 'Argentina',
        Code: 'AR',
        Timezone: 'Argentina Standard Time',
        UTC: 'UTC-03:00',
        MobileCode: '+54'
    }, {
        Name: 'Armenia',
        Code: 'AM',
        Timezone: 'Caucasus Standard Time',
        UTC: 'UTC+04:00',
        MobileCode: '+374'
    }, {
        Name: 'Aruba',
        Code: 'AW',
        Timezone: 'SA Western Standard Time',
        UTC: 'UTC-04:00',
        MobileCode: '+297'
    }, {
        Name: 'Australia',
        Code: 'AU',
        Timezone: 'AUS Eastern Standard Time',
        UTC: 'UTC+10:00',
        MobileCode: '+61'
    }, {
        Name: 'Austria',
        Code: 'AT',
        Timezone: 'W. Europe Standard Time',
        UTC: 'UTC+01:00',
        MobileCode: '+43'
    }, {
        Name: 'Azerbaijan',
        Code: 'AZ',
        Timezone: 'Azerbaijan Standard Time',
        UTC: 'UTC+04:00',
        MobileCode: '+994'
    }, {
        Name: 'Bahamas, The',
        Code: 'BS',
        Timezone: 'Eastern Standard Time',
        UTC: 'UTC-05:00',
        MobileCode: '+1-242'
    }, {
        Name: 'Bahrain',
        Code: 'BH',
        Timezone: 'Arab Standard Time',
        UTC: 'UTC+03:00',
        MobileCode: '+973'
    }, {
        Name: 'Bangladesh',
        Code: 'BD',
        Timezone: 'Bangladesh Standard Time',
        UTC: 'UTC+06:00',
        MobileCode: '+880'
    }, {
        Name: 'Barbados',
        Code: 'BB',
        Timezone: 'SA Western Standard Time',
        UTC: 'UTC-04:00',
        MobileCode: '+1-246'
    }, {
        Name: 'Belarus',
        Code: 'BY',
        Timezone: 'Belarus Standard Time',
        UTC: 'UTC+03:00',
        MobileCode: '+375'
    }, {
        Name: 'Belgium',
        Code: 'BE',
        Timezone: 'Romance Standard Time',
        UTC: 'UTC+01:00',
        MobileCode: '+32'
    }, {
        Name: 'Belize',
        Code: 'BZ',
        Timezone: 'Central America Standard Time',
        UTC: 'UTC-06:00',
        MobileCode: '+501'
    }, {
        Name: 'Benin',
        Code: 'BJ',
        Timezone: 'W. Central Africa Standard Time',
        UTC: 'UTC+01:00',
        MobileCode: '+229'
    }, {
        Name: 'Bermuda',
        Code: 'BM',
        Timezone: 'Atlantic Standard Time',
        UTC: 'UTC-04:00',
        MobileCode: '+1-441'
    }, {
        Name: 'Bhutan',
        Code: 'BT',
        Timezone: 'Bangladesh Standard Time',
        UTC: 'UTC+06:00',
        MobileCode: '+975'
    }, {
        Name: 'Bolivarian Republic of Venezuela',
        Code: 'VE',
        Timezone: 'Venezuela Standard Time',
        UTC: 'UTC-04:30',
        MobileCode: '+58'
    }, {
        Name: 'Bolivia',
        Code: 'BO',
        Timezone: 'SA Western Standard Time',
        UTC: 'UTC-04:00',
        MobileCode: '+591'
    }, {
        Name: 'Bonaire, Sint Eustatius and Saba',
        Code: 'BQ',
        Timezone: 'SA Western Standard Time',
        UTC: 'UTC-04:00',
        MobileCode: '+599'
    }, {
        Name: 'Bosnia and Herzegovina',
        Code: 'BA',
        Timezone: 'Central European Standard Time',
        UTC: 'UTC+01:00',
        MobileCode: '+387'
    }, {
        Name: 'Botswana',
        Code: 'BW',
        Timezone: 'South Africa Standard Time',
        UTC: 'UTC+02:00',
        MobileCode: '+267'
    }, {Name: 'Bouvet Island', Code: 'BV', Timezone: 'UTC', UTC: 'UTC', MobileCode: '+'}, {
        Name: 'Brazil',
        Code: 'BR',
        Timezone: 'E. South America Standard Time',
        UTC: 'UTC-03:00',
        MobileCode: '+55'
    }, {
        Name: 'British Indian Ocean Territory',
        Code: 'IO',
        Timezone: 'Central Asia Standard Time',
        UTC: 'UTC+06:00',
        MobileCode: '+246'
    }, {
        Name: 'Brunei',
        Code: 'BN',
        Timezone: 'Singapore Standard Time',
        UTC: 'UTC+08:00',
        MobileCode: '+673'
    }, {
        Name: 'Bulgaria',
        Code: 'BG',
        Timezone: 'FLE Standard Time',
        UTC: 'UTC+02:00',
        MobileCode: '+359'
    }, {
        Name: 'Burkina Faso',
        Code: 'BF',
        Timezone: 'Greenwich Standard Time',
        UTC: 'UTC',
        MobileCode: '+226'
    }, {
        Name: 'Burundi',
        Code: 'BI',
        Timezone: 'South Africa Standard Time',
        UTC: 'UTC+02:00',
        MobileCode: '+257'
    }, {
        Name: 'Cabo Verde',
        Code: 'CV',
        Timezone: 'Cape Verde Standard Time',
        UTC: 'UTC-01:00',
        MobileCode: '+238'
    }, {
        Name: 'Cambodia',
        Code: 'KH',
        Timezone: 'SE Asia Standard Time',
        UTC: 'UTC+07:00',
        MobileCode: '+855'
    }, {
        Name: 'Cameroon',
        Code: 'CM',
        Timezone: 'W. Central Africa Standard Time',
        UTC: 'UTC+01:00',
        MobileCode: '+237'
    }, {
        Name: 'Canada',
        Code: 'CA',
        Timezone: 'Eastern Standard Time',
        UTC: 'UTC-05:00',
        MobileCode: '+1'
    }, {
        Name: 'Cayman Islands',
        Code: 'KY',
        Timezone: 'SA Pacific Standard Time',
        UTC: 'UTC-05:00',
        MobileCode: '+1-345'
    }, {
        Name: 'Central African Republic',
        Code: 'CF',
        Timezone: 'W. Central Africa Standard Time',
        UTC: 'UTC+01:00',
        MobileCode: '+236'
    }, {
        Name: 'Chad',
        Code: 'TD',
        Timezone: 'W. Central Africa Standard Time',
        UTC: 'UTC+01:00',
        MobileCode: '+235'
    }, {
        Name: 'Chile',
        Code: 'CL',
        Timezone: 'Pacific SA Standard Time',
        UTC: 'UTC-03:00',
        MobileCode: '+56'
    }, {
        Name: 'China',
        Code: 'CN',
        Timezone: 'China Standard Time',
        UTC: 'UTC+08:00',
        MobileCode: '+86'
    }, {
        Name: 'Christmas Island',
        Code: 'CX',
        Timezone: 'SE Asia Standard Time',
        UTC: 'UTC+07:00',
        MobileCode: '+61'
    }, {
        Name: 'Cocos (Keeling) Islands',
        Code: 'CC',
        Timezone: 'Myanmar Standard Time',
        UTC: 'UTC+06:30',
        MobileCode: '+61'
    }, {
        Name: 'Colombia',
        Code: 'CO',
        Timezone: 'SA Pacific Standard Time',
        UTC: 'UTC-05:00',
        MobileCode: '+57'
    }, {
        Name: 'Comoros',
        Code: 'KM',
        Timezone: 'E. Africa Standard Time',
        UTC: 'UTC+03:00',
        MobileCode: '+269'
    }, {
        Name: 'Congo',
        Code: 'CG',
        Timezone: 'W. Central Africa Standard Time',
        UTC: 'UTC+01:00',
        MobileCode: '+242'
    }, {
        Name: 'Congo (DRC)',
        Code: 'CD',
        Timezone: 'W. Central Africa Standard Time',
        UTC: 'UTC+01:00',
        MobileCode: '+243'
    }, {
        Name: 'Cook Islands',
        Code: 'CK',
        Timezone: 'Hawaiian Standard Time',
        UTC: 'UTC-10:00',
        MobileCode: '+682'
    }, {
        Name: 'Costa Rica',
        Code: 'CR',
        Timezone: 'Central America Standard Time',
        UTC: 'UTC-06:00',
        MobileCode: '+506'
    }, {
        Name: "Côte d'Ivoire",
        Code: 'CI',
        Timezone: 'Greenwich Standard Time',
        UTC: 'UTC',
        MobileCode: '+225'
    }, {
        Name: 'Croatia',
        Code: 'HR',
        Timezone: 'Central European Standard Time',
        UTC: 'UTC+01:00',
        MobileCode: '+385'
    }, {
        Name: 'Cuba',
        Code: 'CU',
        Timezone: 'Eastern Standard Time',
        UTC: 'UTC-05:00',
        MobileCode: '+53'
    }, {
        Name: 'Curaçao',
        Code: 'CW',
        Timezone: 'SA Western Standard Time',
        UTC: 'UTC-04:00',
        MobileCode: '+599'
    }, {
        Name: 'Cyprus',
        Code: 'CY',
        Timezone: 'E. Europe Standard Time',
        UTC: 'UTC+02:00',
        MobileCode: '+357'
    }, {
        Name: 'Czech Republic',
        Code: 'CZ',
        Timezone: 'Central Europe Standard Time',
        UTC: 'UTC+01:00',
        MobileCode: '+420'
    }, {
        Name: 'Democratic Republic of Timor-Leste',
        Code: 'TL',
        Timezone: 'Tokyo Standard Time',
        UTC: 'UTC+09:00',
        MobileCode: '+670'
    }, {
        Name: 'Denmark',
        Code: 'DK',
        Timezone: 'Romance Standard Time',
        UTC: 'UTC+01:00',
        MobileCode: '+45'
    }, {
        Name: 'Djibouti',
        Code: 'DJ',
        Timezone: 'E. Africa Standard Time',
        UTC: 'UTC+03:00',
        MobileCode: '+253'
    }, {
        Name: 'Dominica',
        Code: 'DM',
        Timezone: 'SA Western Standard Time',
        UTC: 'UTC-04:00',
        MobileCode: '+1-767'
    }, {
        Name: 'Dominican Republic',
        Code: 'DO',
        Timezone: 'SA Western Standard Time',
        UTC: 'UTC-04:00',
        MobileCode: '+1-809 and 1-829'
    }, {
        Name: 'Ecuador',
        Code: 'EC',
        Timezone: 'SA Pacific Standard Time',
        UTC: 'UTC-05:00',
        MobileCode: '+593'
    }, {
        Name: 'Egypt',
        Code: 'EG',
        Timezone: 'Egypt Standard Time',
        UTC: 'UTC+02:00',
        MobileCode: '+20'
    }, {
        Name: 'El Salvador',
        Code: 'SV',
        Timezone: 'Central America Standard Time',
        UTC: 'UTC-06:00',
        MobileCode: '+503'
    }, {
        Name: 'Equatorial Guinea',
        Code: 'GQ',
        Timezone: 'W. Central Africa Standard Time',
        UTC: 'UTC+01:00',
        MobileCode: '+240'
    }, {
        Name: 'Eritrea',
        Code: 'ER',
        Timezone: 'E. Africa Standard Time',
        UTC: 'UTC+03:00',
        MobileCode: '+291'
    }, {
        Name: 'Estonia',
        Code: 'EE',
        Timezone: 'FLE Standard Time',
        UTC: 'UTC+02:00',
        MobileCode: '+372'
    }, {
        Name: 'Ethiopia',
        Code: 'ET',
        Timezone: 'E. Africa Standard Time',
        UTC: 'UTC+03:00',
        MobileCode: '+251'
    }, {
        Name: 'Falkland Islands (Islas Malvinas)',
        Code: 'FK',
        Timezone: 'SA Eastern Standard Time',
        UTC: 'UTC-03:00',
        MobileCode: '+500'
    }, {
        Name: 'Faroe Islands',
        Code: 'FO',
        Timezone: 'GMT Standard Time',
        UTC: 'UTC',
        MobileCode: '+298'
    }, {
        Name: 'Fiji Islands',
        Code: 'FJ',
        Timezone: 'Fiji Standard Time',
        UTC: 'UTC+12:00',
        MobileCode: '+679'
    }, {
        Name: 'Finland',
        Code: 'FI',
        Timezone: 'FLE Standard Time',
        UTC: 'UTC+02:00',
        MobileCode: '+358'
    }, {
        Name: 'France',
        Code: 'FR',
        Timezone: 'Romance Standard Time',
        UTC: 'UTC+01:00',
        MobileCode: '+33'
    }, {
        Name: 'French Guiana',
        Code: 'GF',
        Timezone: 'SA Eastern Standard Time',
        UTC: 'UTC-03:00',
        MobileCode: '+594'
    }, {
        Name: 'French Polynesia',
        Code: 'PF',
        Timezone: 'Hawaiian Standard Time',
        UTC: 'UTC-10:00',
        MobileCode: '+689'
    }, {
        Name: 'French Southern and Antarctic Lands',
        Code: 'TF',
        Timezone: 'West Asia Standard Time',
        UTC: 'UTC+05:00',
        MobileCode: '+'
    }, {
        Name: 'Gabon',
        Code: 'GA',
        Timezone: 'W. Central Africa Standard Time',
        UTC: 'UTC+01:00',
        MobileCode: '+241'
    }, {
        Name: 'Gambia, The',
        Code: 'GM',
        Timezone: 'Greenwich Standard Time',
        UTC: 'UTC',
        MobileCode: '+220'
    }, {
        Name: 'Georgia',
        Code: 'GE',
        Timezone: 'Georgian Standard Time',
        UTC: 'UTC+04:00',
        MobileCode: '+995'
    }, {
        Name: 'Germany',
        Code: 'DE',
        Timezone: 'W. Europe Standard Time',
        UTC: 'UTC+01:00',
        MobileCode: '+49'
    }, {
        Name: 'Ghana',
        Code: 'GH',
        Timezone: 'Greenwich Standard Time',
        UTC: 'UTC',
        MobileCode: '+233'
    }, {
        Name: 'Gibraltar',
        Code: 'GI',
        Timezone: 'W. Europe Standard Time',
        UTC: 'UTC+01:00',
        MobileCode: '+350'
    }, {
        Name: 'Greece',
        Code: 'GR',
        Timezone: 'GTB Standard Time',
        UTC: 'UTC+02:00',
        MobileCode: '+30'
    }, {
        Name: 'Greenland',
        Code: 'GL',
        Timezone: 'Greenland Standard Time',
        UTC: 'UTC-03:00',
        MobileCode: '+299'
    }, {
        Name: 'Grenada',
        Code: 'GD',
        Timezone: 'SA Western Standard Time',
        UTC: 'UTC-04:00',
        MobileCode: '+1-473'
    }, {
        Name: 'Guadeloupe',
        Code: 'GP',
        Timezone: 'SA Western Standard Time',
        UTC: 'UTC-04:00',
        MobileCode: '+590'
    }, {
        Name: 'Guam',
        Code: 'GU',
        Timezone: 'West Pacific Standard Time',
        UTC: 'UTC+10:00',
        MobileCode: '+1-671'
    }, {
        Name: 'Guatemala',
        Code: 'GT',
        Timezone: 'Central America Standard Time',
        UTC: 'UTC-06:00',
        MobileCode: '+502'
    }, {
        Name: 'Guernsey',
        Code: 'GG',
        Timezone: 'GMT Standard Time',
        UTC: 'UTC',
        MobileCode: '+44-1481'
    }, {
        Name: 'Guinea',
        Code: 'GN',
        Timezone: 'Greenwich Standard Time',
        UTC: 'UTC',
        MobileCode: '+224'
    }, {
        Name: 'Guinea-Bissau',
        Code: 'GW',
        Timezone: 'Greenwich Standard Time',
        UTC: 'UTC',
        MobileCode: '+245'
    }, {
        Name: 'Guyana',
        Code: 'GY',
        Timezone: 'SA Western Standard Time',
        UTC: 'UTC-04:00',
        MobileCode: '+592'
    }, {
        Name: 'Haiti',
        Code: 'HT',
        Timezone: 'Eastern Standard Time',
        UTC: 'UTC-05:00',
        MobileCode: '+509'
    }, {
        Name: 'Heard Island and McDonald Islands',
        Code: 'HM',
        Timezone: 'Mauritius Standard Time',
        UTC: 'UTC+04:00',
        MobileCode: '+ '
    }, {
        Name: 'Honduras',
        Code: 'HN',
        Timezone: 'Central America Standard Time',
        UTC: 'UTC-06:00',
        MobileCode: '+504'
    }, {
        Name: 'Hong Kong SAR',
        Code: 'HK',
        Timezone: 'China Standard Time',
        UTC: 'UTC+08:00',
        MobileCode: '+852'
    }, {
        Name: 'Hungary',
        Code: 'HU',
        Timezone: 'Central Europe Standard Time',
        UTC: 'UTC+01:00',
        MobileCode: '+36'
    }, {
        Name: 'Iceland',
        Code: 'IS',
        Timezone: 'Greenwich Standard Time',
        UTC: 'UTC',
        MobileCode: '+354'
    }, {
        Name: 'India',
        Code: 'IN',
        Timezone: 'India Standard Time',
        UTC: 'UTC+05:30',
        MobileCode: '+91'
    }, {
        Name: 'Indonesia',
        Code: 'ID',
        Timezone: 'SE Asia Standard Time',
        UTC: 'UTC+07:00',
        MobileCode: '+62'
    }, {Name: 'Iran', Code: 'IR', Timezone: 'Iran Standard Time', UTC: 'UTC+03:30', MobileCode: '+98'}, {
        Name: 'Iraq',
        Code: 'IQ',
        Timezone: 'Arabic Standard Time',
        UTC: 'UTC+03:00',
        MobileCode: '+964'
    }, {Name: 'Ireland', Code: 'IE', Timezone: 'GMT Standard Time', UTC: 'UTC', MobileCode: '+353'}, {
        Name: 'Israel',
        Code: 'IL',
        Timezone: 'Israel Standard Time',
        UTC: 'UTC+02:00',
        MobileCode: '+972'
    }, {
        Name: 'Italy',
        Code: 'IT',
        Timezone: 'W. Europe Standard Time',
        UTC: 'UTC+01:00',
        MobileCode: '+39'
    }, {
        Name: 'Jamaica',
        Code: 'JM',
        Timezone: 'SA Pacific Standard Time',
        UTC: 'UTC-05:00',
        MobileCode: '+1-876'
    }, {
        Name: 'Jan Mayen',
        Code: 'SJ',
        Timezone: 'W. Europe Standard Time',
        UTC: 'UTC+01:00',
        MobileCode: '+47'
    }, {
        Name: 'Japan',
        Code: 'JP',
        Timezone: 'Tokyo Standard Time',
        UTC: 'UTC+09:00',
        MobileCode: '+81'
    }, {Name: 'Jersey', Code: 'JE', Timezone: 'GMT Standard Time', UTC: 'UTC', MobileCode: '+44-1534'}, {
        Name: 'Jordan',
        Code: 'JO',
        Timezone: 'Jordan Standard Time',
        UTC: 'UTC+02:00',
        MobileCode: '+962'
    }, {
        Name: 'Kazakhstan',
        Code: 'KZ',
        Timezone: 'Central Asia Standard Time',
        UTC: 'UTC+06:00',
        MobileCode: '+7'
    }, {
        Name: 'Kenya',
        Code: 'KE',
        Timezone: 'E. Africa Standard Time',
        UTC: 'UTC+03:00',
        MobileCode: '+254'
    }, {Name: 'Kiribati', Code: 'KI', Timezone: 'UTC+12', UTC: 'UTC+12:00', MobileCode: '+686'}, {
        Name: 'Korea',
        Code: 'KR',
        Timezone: 'Korea Standard Time',
        UTC: 'UTC+09:00',
        MobileCode: '+82'
    }, {
        Name: 'Kosovo',
        Code: 'XK',
        Timezone: 'Central European Standard Time',
        UTC: 'UTC+01:00',
        MobileCode: '+'
    }, {
        Name: 'Kuwait',
        Code: 'KW',
        Timezone: 'Arab Standard Time',
        UTC: 'UTC+03:00',
        MobileCode: '+965'
    }, {
        Name: 'Kyrgyzstan',
        Code: 'KG',
        Timezone: 'Central Asia Standard Time',
        UTC: 'UTC+06:00',
        MobileCode: '+996'
    }, {
        Name: 'Laos',
        Code: 'LA',
        Timezone: 'SE Asia Standard Time',
        UTC: 'UTC+07:00',
        MobileCode: '+856'
    }, {
        Name: 'Latvia',
        Code: 'LV',
        Timezone: 'FLE Standard Time',
        UTC: 'UTC+02:00',
        MobileCode: '+371'
    }, {
        Name: 'Lebanon',
        Code: 'LB',
        Timezone: 'Middle East Standard Time',
        UTC: 'UTC+02:00',
        MobileCode: '+961'
    }, {
        Name: 'Lesotho',
        Code: 'LS',
        Timezone: 'South Africa Standard Time',
        UTC: 'UTC+02:00',
        MobileCode: '+266'
    }, {
        Name: 'Liberia',
        Code: 'LR',
        Timezone: 'Greenwich Standard Time',
        UTC: 'UTC',
        MobileCode: '+231'
    }, {
        Name: 'Libya',
        Code: 'LY',
        Timezone: 'E. Europe Standard Time',
        UTC: 'UTC+02:00',
        MobileCode: '+218'
    }, {
        Name: 'Liechtenstein',
        Code: 'LI',
        Timezone: 'W. Europe Standard Time',
        UTC: 'UTC+01:00',
        MobileCode: '+423'
    }, {
        Name: 'Lithuania',
        Code: 'LT',
        Timezone: 'FLE Standard Time',
        UTC: 'UTC+02:00',
        MobileCode: '+370'
    }, {
        Name: 'Luxembourg',
        Code: 'LU',
        Timezone: 'W. Europe Standard Time',
        UTC: 'UTC+01:00',
        MobileCode: '+352'
    }, {
        Name: 'Macao SAR',
        Code: 'MO',
        Timezone: 'China Standard Time',
        UTC: 'UTC+08:00',
        MobileCode: '+853'
    }, {
        Name: 'Macedonia, Former Yugoslav Republic of',
        Code: 'MK',
        Timezone: 'Central European Standard Time',
        UTC: 'UTC+01:00',
        MobileCode: '+389'
    }, {
        Name: 'Madagascar',
        Code: 'MG',
        Timezone: 'E. Africa Standard Time',
        UTC: 'UTC+03:00',
        MobileCode: '+261'
    }, {
        Name: 'Malawi',
        Code: 'MW',
        Timezone: 'South Africa Standard Time',
        UTC: 'UTC+02:00',
        MobileCode: '+265'
    }, {
        Name: 'Malaysia',
        Code: 'MY',
        Timezone: 'Singapore Standard Time',
        UTC: 'UTC+08:00',
        MobileCode: '+60'
    }, {
        Name: 'Maldives',
        Code: 'MV',
        Timezone: 'West Asia Standard Time',
        UTC: 'UTC+05:00',
        MobileCode: '+960'
    }, {Name: 'Mali', Code: 'ML', Timezone: 'Greenwich Standard Time', UTC: 'UTC', MobileCode: '+223'}, {
        Name: 'Malta',
        Code: 'MT',
        Timezone: 'W. Europe Standard Time',
        UTC: 'UTC+01:00',
        MobileCode: '+356'
    }, {
        Name: 'Man, Isle of',
        Code: 'IM',
        Timezone: 'GMT Standard Time',
        UTC: 'UTC',
        MobileCode: '+44-1624'
    }, {
        Name: 'Marshall Islands',
        Code: 'MH',
        Timezone: 'UTC+12',
        UTC: 'UTC+12:00',
        MobileCode: '+692'
    }, {
        Name: 'Martinique',
        Code: 'MQ',
        Timezone: 'SA Western Standard Time',
        UTC: 'UTC-04:00',
        MobileCode: '+596'
    }, {
        Name: 'Mauritania',
        Code: 'MR',
        Timezone: 'Greenwich Standard Time',
        UTC: 'UTC',
        MobileCode: '+222'
    }, {
        Name: 'Mauritius',
        Code: 'MU',
        Timezone: 'Mauritius Standard Time',
        UTC: 'UTC+04:00',
        MobileCode: '+230'
    }, {
        Name: 'Mayotte',
        Code: 'YT',
        Timezone: 'E. Africa Standard Time',
        UTC: 'UTC+03:00',
        MobileCode: '+262'
    }, {
        Name: 'Mexico',
        Code: 'MX',
        Timezone: 'Central Standard Time (Mexico)',
        UTC: 'UTC-06:00',
        MobileCode: '+52'
    }, {
        Name: 'Micronesia',
        Code: 'FM',
        Timezone: 'West Pacific Standard Time',
        UTC: 'UTC+10:00',
        MobileCode: '+691'
    }, {
        Name: 'Moldova',
        Code: 'MD',
        Timezone: 'GTB Standard Time',
        UTC: 'UTC+02:00',
        MobileCode: '+373'
    }, {
        Name: 'Monaco',
        Code: 'MC',
        Timezone: 'W. Europe Standard Time',
        UTC: 'UTC+01:00',
        MobileCode: '+377'
    }, {
        Name: 'Mongolia',
        Code: 'MN',
        Timezone: 'Ulaanbaatar Standard Time',
        UTC: 'UTC+08:00',
        MobileCode: '+976'
    }, {
        Name: 'Montenegro',
        Code: 'ME',
        Timezone: 'Central European Standard Time',
        UTC: 'UTC+01:00',
        MobileCode: '+382'
    }, {
        Name: 'Montserrat',
        Code: 'MS',
        Timezone: 'SA Western Standard Time',
        UTC: 'UTC-04:00',
        MobileCode: '+1-664'
    }, {
        Name: 'Morocco',
        Code: 'MA',
        Timezone: 'Morocco Standard Time',
        UTC: 'UTC',
        MobileCode: '+212'
    }, {
        Name: 'Mozambique',
        Code: 'MZ',
        Timezone: 'South Africa Standard Time',
        UTC: 'UTC+02:00',
        MobileCode: '+258'
    }, {
        Name: 'Myanmar',
        Code: 'MM',
        Timezone: 'Myanmar Standard Time',
        UTC: 'UTC+06:30',
        MobileCode: '+95'
    }, {
        Name: 'Namibia',
        Code: 'NA',
        Timezone: 'Namibia Standard Time',
        UTC: 'UTC+01:00',
        MobileCode: '+264'
    }, {Name: 'Nauru', Code: 'NR', Timezone: 'UTC+12', UTC: 'UTC+12:00', MobileCode: '+674'}, {
        Name: 'Nepal',
        Code: 'NP',
        Timezone: 'Nepal Standard Time',
        UTC: 'UTC+05:45',
        MobileCode: '+977'
    }, {
        Name: 'Netherlands',
        Code: 'NL',
        Timezone: 'W. Europe Standard Time',
        UTC: 'UTC+01:00',
        MobileCode: '+31'
    }, {
        Name: 'New Caledonia',
        Code: 'NC',
        Timezone: 'Central Pacific Standard Time',
        UTC: 'UTC+11:00',
        MobileCode: '+687'
    }, {
        Name: 'New Zealand',
        Code: 'NZ',
        Timezone: 'New Zealand Standard Time',
        UTC: 'UTC+12:00',
        MobileCode: '+64'
    }, {
        Name: 'Nicaragua',
        Code: 'NI',
        Timezone: 'Central America Standard Time',
        UTC: 'UTC-06:00',
        MobileCode: '+505'
    }, {
        Name: 'Niger',
        Code: 'NE',
        Timezone: 'W. Central Africa Standard Time',
        UTC: 'UTC+01:00',
        MobileCode: '+227'
    }, {
        Name: 'Nigeria',
        Code: 'NG',
        Timezone: 'W. Central Africa Standard Time',
        UTC: 'UTC+01:00',
        MobileCode: '+234'
    }, {Name: 'Niue', Code: 'NU', Timezone: 'UTC-11', UTC: 'UTC-11:00', MobileCode: '+683'}, {
        Name: 'Norfolk Island',
        Code: 'NF',
        Timezone: 'Central Pacific Standard Time',
        UTC: 'UTC+11:00',
        MobileCode: '+672'
    }, {
        Name: 'North Korea',
        Code: 'KP',
        Timezone: 'Korea Standard Time',
        UTC: 'UTC+09:00',
        MobileCode: '+850'
    }, {
        Name: 'Northern Mariana Islands',
        Code: 'MP',
        Timezone: 'West Pacific Standard Time',
        UTC: 'UTC+10:00',
        MobileCode: '+1-670'
    }, {
        Name: 'Norway',
        Code: 'NO',
        Timezone: 'W. Europe Standard Time',
        UTC: 'UTC+01:00',
        MobileCode: '+47'
    }, {
        Name: 'Oman',
        Code: 'OM',
        Timezone: 'Arabian Standard Time',
        UTC: 'UTC+04:00',
        MobileCode: '+968'
    }, {
        Name: 'Pakistan',
        Code: 'PK',
        Timezone: 'Pakistan Standard Time',
        UTC: 'UTC+05:00',
        MobileCode: '+92'
    }, {
        Name: 'Palau',
        Code: 'PW',
        Timezone: 'Tokyo Standard Time',
        UTC: 'UTC+09:00',
        MobileCode: '+680'
    }, {
        Name: 'Palestinian Authority',
        Code: 'PS',
        Timezone: 'Egypt Standard Time',
        UTC: 'UTC+02:00',
        MobileCode: '+970'
    }, {
        Name: 'Panama',
        Code: 'PA',
        Timezone: 'SA Pacific Standard Time',
        UTC: 'UTC-05:00',
        MobileCode: '+507'
    }, {
        Name: 'Papua New Guinea',
        Code: 'PG',
        Timezone: 'West Pacific Standard Time',
        UTC: 'UTC+10:00',
        MobileCode: '+675'
    }, {
        Name: 'Paraguay',
        Code: 'PY',
        Timezone: 'Paraguay Standard Time',
        UTC: 'UTC-04:00',
        MobileCode: '+595'
    }, {
        Name: 'Peru',
        Code: 'PE',
        Timezone: 'SA Pacific Standard Time',
        UTC: 'UTC-05:00',
        MobileCode: '+51'
    }, {
        Name: 'Philippines',
        Code: 'PH',
        Timezone: 'Singapore Standard Time',
        UTC: 'UTC+08:00',
        MobileCode: '+63'
    }, {
        Name: 'Pitcairn Islands',
        Code: 'PN',
        Timezone: 'Pacific Standard Time',
        UTC: 'UTC-08:00',
        MobileCode: '+870'
    }, {
        Name: 'Poland',
        Code: 'PL',
        Timezone: 'Central European Standard Time',
        UTC: 'UTC+01:00',
        MobileCode: '+48'
    }, {
        Name: 'Portugal',
        Code: 'PT',
        Timezone: 'GMT Standard Time',
        UTC: 'UTC',
        MobileCode: '+351'
    }, {
        Name: 'Puerto Rico',
        Code: 'PR',
        Timezone: 'SA Western Standard Time',
        UTC: 'UTC-04:00',
        MobileCode: '+1-787 and 1-939'
    }, {
        Name: 'Qatar',
        Code: 'QA',
        Timezone: 'Arab Standard Time',
        UTC: 'UTC+03:00',
        MobileCode: '+974'
    }, {
        Name: 'Reunion',
        Code: 'RE',
        Timezone: 'Mauritius Standard Time',
        UTC: 'UTC+04:00',
        MobileCode: '+262'
    }, {
        Name: 'Romania',
        Code: 'RO',
        Timezone: 'GTB Standard Time',
        UTC: 'UTC+02:00',
        MobileCode: '+40'
    }, {
        Name: 'Russia',
        Code: 'RU',
        Timezone: 'Russian Standard Time',
        UTC: 'UTC+03:00',
        MobileCode: '+7'
    }, {
        Name: 'Rwanda',
        Code: 'RW',
        Timezone: 'South Africa Standard Time',
        UTC: 'UTC+02:00',
        MobileCode: '+250'
    }, {
        Name: 'Saint Barthélemy',
        Code: 'BL',
        Timezone: 'SA Western Standard Time',
        UTC: 'UTC-04:00',
        MobileCode: '+590'
    }, {
        Name: 'Saint Helena, Ascension and Tristan da Cunha',
        Code: 'SH',
        Timezone: 'Greenwich Standard Time',
        UTC: 'UTC',
        MobileCode: '+290'
    }, {
        Name: 'Saint Kitts and Nevis',
        Code: 'KN',
        Timezone: 'SA Western Standard Time',
        UTC: 'UTC-04:00',
        MobileCode: '+1-869'
    }, {
        Name: 'Saint Lucia',
        Code: 'LC',
        Timezone: 'SA Western Standard Time',
        UTC: 'UTC-04:00',
        MobileCode: '+1-758'
    }, {
        Name: 'Saint Martin (French part)',
        Code: 'MF',
        Timezone: 'SA Western Standard Time',
        UTC: 'UTC-04:00',
        MobileCode: '+590'
    }, {
        Name: 'Saint Pierre and Miquelon',
        Code: 'PM',
        Timezone: 'Greenland Standard Time',
        UTC: 'UTC-03:00',
        MobileCode: '+508'
    }, {
        Name: 'Saint Vincent and the Grenadines',
        Code: 'VC',
        Timezone: 'SA Western Standard Time',
        UTC: 'UTC-04:00',
        MobileCode: '+1-784'
    }, {
        Name: 'Samoa',
        Code: 'WS',
        Timezone: 'Samoa Standard Time',
        UTC: 'UTC+13:00',
        MobileCode: '+685'
    }, {
        Name: 'San Marino',
        Code: 'SM',
        Timezone: 'W. Europe Standard Time',
        UTC: 'UTC+01:00',
        MobileCode: '+378'
    }, {
        Name: 'São Tomé and Príncipe',
        Code: 'ST',
        Timezone: 'Greenwich Standard Time',
        UTC: 'UTC',
        MobileCode: '+239'
    }, {
        Name: 'Saudi Arabia',
        Code: 'SA',
        Timezone: 'Arab Standard Time',
        UTC: 'UTC+03:00',
        MobileCode: '+966'
    }, {
        Name: 'Senegal',
        Code: 'SN',
        Timezone: 'Greenwich Standard Time',
        UTC: 'UTC',
        MobileCode: '+221'
    }, {
        Name: 'Serbia',
        Code: 'RS',
        Timezone: 'Central Europe Standard Time',
        UTC: 'UTC+01:00',
        MobileCode: '+381'
    }, {
        Name: 'Seychelles',
        Code: 'SC',
        Timezone: 'Mauritius Standard Time',
        UTC: 'UTC+04:00',
        MobileCode: '+248'
    }, {
        Name: 'Sierra Leone',
        Code: 'SL',
        Timezone: 'Greenwich Standard Time',
        UTC: 'UTC',
        MobileCode: '+232'
    }, {
        Name: 'Singapore',
        Code: 'SG',
        Timezone: 'Singapore Standard Time',
        UTC: 'UTC+08:00',
        MobileCode: '+65'
    }, {
        Name: 'Sint Maarten (Dutch part)',
        Code: 'SX',
        Timezone: 'SA Western Standard Time',
        UTC: 'UTC-04:00',
        MobileCode: '+599'
    }, {
        Name: 'Slovakia',
        Code: 'SK',
        Timezone: 'Central Europe Standard Time',
        UTC: 'UTC+01:00',
        MobileCode: '+421'
    }, {
        Name: 'Slovenia',
        Code: 'SI',
        Timezone: 'Central Europe Standard Time',
        UTC: 'UTC+01:00',
        MobileCode: '+386'
    }, {
        Name: 'Solomon Islands',
        Code: 'SB',
        Timezone: 'Central Pacific Standard Time',
        UTC: 'UTC+11:00',
        MobileCode: '+677'
    }, {
        Name: 'Somalia',
        Code: 'SO',
        Timezone: 'E. Africa Standard Time',
        UTC: 'UTC+03:00',
        MobileCode: '+252'
    }, {
        Name: 'South Africa',
        Code: 'ZA',
        Timezone: 'South Africa Standard Time',
        UTC: 'UTC+02:00',
        MobileCode: '+27'
    }, {
        Name: 'South Georgia and the South Sandwich Islands',
        Code: 'GS',
        Timezone: 'UTC-02',
        UTC: 'UTC-02:00',
        MobileCode: '+'
    }, {
        Name: 'South Sudan',
        Code: 'SS',
        Timezone: 'E. Africa Standard Time',
        UTC: 'UTC+03:00',
        MobileCode: '+211'
    }, {
        Name: 'Spain',
        Code: 'ES',
        Timezone: 'Romance Standard Time',
        UTC: 'UTC+01:00',
        MobileCode: '+34'
    }, {
        Name: 'Sri Lanka',
        Code: 'LK',
        Timezone: 'Sri Lanka Standard Time',
        UTC: 'UTC+05:30',
        MobileCode: '+94'
    }, {
        Name: 'Sudan',
        Code: 'SD',
        Timezone: 'E. Africa Standard Time',
        UTC: 'UTC+03:00',
        MobileCode: '+249'
    }, {
        Name: 'Suriname',
        Code: 'SR',
        Timezone: 'SA Eastern Standard Time',
        UTC: 'UTC-03:00',
        MobileCode: '+597'
    }, {
        Name: 'Svalbard',
        Code: 'SJ',
        Timezone: 'W. Europe Standard Time',
        UTC: 'UTC+01:00',
        MobileCode: '+47'
    }, {
        Name: 'Swaziland',
        Code: 'SZ',
        Timezone: 'South Africa Standard Time',
        UTC: 'UTC+02:00',
        MobileCode: '+268'
    }, {
        Name: 'Sweden',
        Code: 'SE',
        Timezone: 'W. Europe Standard Time',
        UTC: 'UTC+01:00',
        MobileCode: '+46'
    }, {
        Name: 'Switzerland',
        Code: 'CH',
        Timezone: 'W. Europe Standard Time',
        UTC: 'UTC+01:00',
        MobileCode: '+41'
    }, {
        Name: 'Syria',
        Code: 'SY',
        Timezone: 'Syria Standard Time',
        UTC: 'UTC+02:00',
        MobileCode: '+963'
    }, {
        Name: 'Taiwan',
        Code: 'TW',
        Timezone: 'Taipei Standard Time',
        UTC: 'UTC+08:00',
        MobileCode: '+886'
    }, {
        Name: 'Tajikistan',
        Code: 'TJ',
        Timezone: 'West Asia Standard Time',
        UTC: 'UTC+05:00',
        MobileCode: '+992'
    }, {
        Name: 'Tanzania',
        Code: 'TZ',
        Timezone: 'E. Africa Standard Time',
        UTC: 'UTC+03:00',
        MobileCode: '+255'
    }, {
        Name: 'Thailand',
        Code: 'TH',
        Timezone: 'SE Asia Standard Time',
        UTC: 'UTC+07:00',
        MobileCode: '+66'
    }, {
        Name: 'Togo',
        Code: 'TG',
        Timezone: 'Greenwich Standard Time',
        UTC: 'UTC',
        MobileCode: '+228'
    }, {
        Name: 'Tokelau',
        Code: 'TK',
        Timezone: 'Tonga Standard Time',
        UTC: 'UTC+13:00',
        MobileCode: '+690'
    }, {
        Name: 'Tonga',
        Code: 'TO',
        Timezone: 'Tonga Standard Time',
        UTC: 'UTC+13:00',
        MobileCode: '+676'
    }, {
        Name: 'Trinidad and Tobago',
        Code: 'TT',
        Timezone: 'SA Western Standard Time',
        UTC: 'UTC-04:00',
        MobileCode: '+1-868'
    }, {
        Name: 'Tunisia',
        Code: 'TN',
        Timezone: 'W. Central Africa Standard Time',
        UTC: 'UTC+01:00',
        MobileCode: '+216'
    }, {
        Name: 'Turkey',
        Code: 'TR',
        Timezone: 'Turkey Standard Time',
        UTC: 'UTC+02:00',
        MobileCode: '+90'
    }, {
        Name: 'Turkmenistan',
        Code: 'TM',
        Timezone: 'West Asia Standard Time',
        UTC: 'UTC+05:00',
        MobileCode: '+993'
    }, {
        Name: 'Turks and Caicos Islands',
        Code: 'TC',
        Timezone: 'Eastern Standard Time',
        UTC: 'UTC-05:00',
        MobileCode: '+1-649'
    }, {
        Name: 'Tuvalu',
        Code: 'TV',
        Timezone: 'UTC+12',
        UTC: 'UTC+12:00',
        MobileCode: '+688'
    }, {
        Name: 'U.S. Minor Outlying Islands',
        Code: 'UM',
        Timezone: 'UTC-11',
        UTC: 'UTC-11:00',
        MobileCode: '+1'
    }, {
        Name: 'Uganda',
        Code: 'UG',
        Timezone: 'E. Africa Standard Time',
        UTC: 'UTC+03:00',
        MobileCode: '+256'
    }, {
        Name: 'Ukraine',
        Code: 'UA',
        Timezone: 'FLE Standard Time',
        UTC: 'UTC+02:00',
        MobileCode: '+380'
    }, {
        Name: 'United Arab Emirates',
        Code: 'AE',
        Timezone: 'Arabian Standard Time',
        UTC: 'UTC+04:00',
        MobileCode: '+971'
    }, {
        Name: 'United Kingdom',
        Code: 'GB',
        Timezone: 'GMT Standard Time',
        UTC: 'UTC',
        MobileCode: '+44'
    }, {
        Name: 'United States',
        Code: 'US',
        Timezone: 'Pacific Standard Time',
        UTC: 'UTC-08:00',
        MobileCode: '+1'
    }, {
        Name: 'Uruguay',
        Code: 'UY',
        Timezone: 'Montevideo Standard Time',
        UTC: 'UTC-03:00',
        MobileCode: '+598'
    }, {
        Name: 'Uzbekistan',
        Code: 'UZ',
        Timezone: 'West Asia Standard Time',
        UTC: 'UTC+05:00',
        MobileCode: '+998'
    }, {
        Name: 'Vanuatu',
        Code: 'VU',
        Timezone: 'Central Pacific Standard Time',
        UTC: 'UTC+11:00',
        MobileCode: '+678'
    }, {
        Name: 'Vatican City',
        Code: 'VA',
        Timezone: 'W. Europe Standard Time',
        UTC: 'UTC+01:00',
        MobileCode: '+379'
    }, {
        Name: 'Vietnam',
        Code: 'VN',
        Timezone: 'SE Asia Standard Time',
        UTC: 'UTC+07:00',
        MobileCode: '+84'
    }, {
        Name: 'Virgin Islands, U.S.',
        Code: 'VI',
        Timezone: 'SA Western Standard Time',
        UTC: 'UTC-04:00',
        MobileCode: '+1-340'
    }, {
        Name: 'Virgin Islands, British',
        Code: 'VG',
        Timezone: 'SA Western Standard Time',
        UTC: 'UTC-04:00',
        MobileCode: '+1-284'
    }, {
        Name: 'Wallis and Futuna',
        Code: 'WF',
        Timezone: 'UTC+12',
        UTC: 'UTC+12:00',
        MobileCode: '+681'
    }, {
        Name: 'Yemen',
        Code: 'YE',
        Timezone: 'Arab Standard Time',
        UTC: 'UTC+03:00',
        MobileCode: '+967'
    }, {
        Name: 'Zambia',
        Code: 'ZM',
        Timezone: 'South Africa Standard Time',
        UTC: 'UTC+02:00',
        MobileCode: '+260'
    }, {Name: 'Zimbabwe', Code: 'ZW', Timezone: 'South Africa Standard Time', UTC: 'UTC+02:00', MobileCode: '+263'}]
    let lastUploadedDoctorPhoto;

    try {
        // Retrieve the last uploaded doctor photo
        const doctorPhotodocs = await DoctorPhoto.find({}).sort({_id: -1}).limit(1).exec();

        if (doctorPhotodocs.length > 0) {
            // Assign the last uploaded photo to the variable
            lastUploadedDoctorPhoto = path.basename(doctorPhotodocs[0].doctorPhoto);

            // Use the last uploaded photo here
            console.log(lastUploadedDoctorPhoto);
        }

        // Retrieve other necessary data from the database
        const doctor = await Doctor.find({}).exec();
        const authentication = await Authentication.find({}).exec();
        const clinic = await Clinic.find({}).exec();
        const settingSocialMedia = await SettingSocialMedia.find({}).exec();

        // Render the accountSetting view with the retrieved data
        res.render('accountSetting', {
            lastUploadedDoctorPhoto: encodeURIComponent(lastUploadedDoctorPhoto),
            doctor: doctor.length > 0 ? doctor[0] : null,
            authentication: authentication.length > 0 ? authentication[0] : null,
            clinic: clinic.length > 0 ? clinic[0] : null,
            settingSocialMedia: settingSocialMedia.length > 0 ? settingSocialMedia[0] : null,
            allTimeZone: allTimeZone
        });

    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }

})
app.get("/invoices", ensureAuthenticated, async (req, res) => {
    // Retrieve invoices
    const foundInvoices = await Invoice.find({}).limit(10).exec();

    // Retrieve patients with invoices
    const foundPatients = await Patient.find({invoices: {$exists: true, $ne: []}})
        .populate("invoices")
        .exec();

    // Render the invoices view with the retrieved data
    res.render('invoices', {foundPatients, foundInvoices});
});

app.get("/create-invoice", ensureAuthenticated, (req, res) => {
    // Render the createInvoice view
    res.render('createInvoice');
});

app.get("/doctor-profile", ensureAuthenticated, (req, res) => {
    // Render the doctorProfile view
    res.render('doctorProfile');
});

app.get("/book-appointment", ensureAuthenticated, async (req, res) => {
    const hoursList = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

    try {
        // Retrieve all appointments, approved appointments, and canceled appointments
        const foundAppointments = await Appointment.find({}).exec();
        const foundApprovedAppointments = await ApprovedAppointment.find({}).exec();
        const foundCanceledAppointments = await DeletedAppointment.find({}).exec();

        // Render the book-appointment view with the retrieved data
        res.render("book-appointment", {
            foundAppointments: foundAppointments,
            foundApprovedAppointments: foundApprovedAppointments,
            foundCanceledAppointments: foundCanceledAppointments,
            hoursList: hoursList
        });
    } catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
});

app.get("/approved-appointments", ensureAuthenticated, async (req, res) => {
    try {
        // Retrieve all approved appointments
        const foundApprovedAppointments = await ApprovedAppointment.find({}).exec();

        // Render the approved-appointment view with the retrieved data
        res.render("approved-appointment", {
            foundApprovedAppointments: foundApprovedAppointments,
        });
    } catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
});

app.get("/canceled-appointments", ensureAuthenticated, async (req, res) => {
    try {
        // Retrieve all canceled appointments
        const foundCanceledAppointments = await DeletedAppointment.find({}).exec();

        // Render the canceled-appointments view with the retrieved data
        res.render("canceled-appointments", {
            foundCanceledAppointments: foundCanceledAppointments,
        });
    } catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
});


//Star icons generator
function generateStars(rating) {
    var stars = "";
    for (var i = 1; i <= 5; i++) {
        if (i <= rating) {
            stars += "&#9733; "; // Filled star
        } else {
            stars += "&#9734; "; // Empty star
        }
    }
    return stars;
}

app.get("/patients", ensureAuthenticated, async (req, res) => {
    try {
        // Retrieve all patients from the database
        const foundPatients = await Patient.find({}).exec();

        // Render the patients view with the retrieved data
        res.render("patients", {
            foundPatients: foundPatients,
        });
    } catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
});

app.get("/add-patient", ensureAuthenticated, (req, res) => {
    // Render the add-patient view
    res.render("add-patient");
});

app.get("/patient-profile", ensureAuthenticated, async (req, res) => {
    const patientId = req.query.id;
    const hoursList = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

    try {
        // Find the patient by ID and populate the "invoices" field
        const patient = await Patient.findById(patientId).populate("invoices");

        if (!patient) {
            return res.status(404).send("Patient not found");
        }

        // Retrieve last visits, appointments, approved appointments, and canceled appointments
        const lastVisits = await LastVisit.find({}).exec();
        const foundAppointments = await Appointment.find({}).exec();
        const Appointments = await Appointment.find({idNumber: patient.idNumber}).exec();
        const approvedAppointments = await ApprovedAppointment.find({idNumber: patient.idNumber}).exec();
        const deletedAppointments = await DeletedAppointment.find({idNumber: patient.idNumber}).exec();

        // Retrieve the last invoice for the patient, if any
        const lastInvoice = patient.invoices.length > 0 ? patient.invoices[patient.invoices.length - 1] : null;

        // Render the patient-profile view with the retrieved data
        res.render("patient-profile", {
            patient,
            lastInvoice,
            hoursList,
            foundAppointments,
            Appointments,
            approvedAppointments,
            deletedAppointments
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server error");
    }
});

app.get("/drugs", ensureAuthenticated, async (req, res) => {
    try {
        // Retrieve all drugs from the database
        const foundDrugs = await Drug.find({}).exec();

        // Render the drugs view with the retrieved data
        res.render("drugs", {
            foundDrugs: foundDrugs,
        });
    } catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
});

app.get("/add-drug", ensureAuthenticated, (req, res) => {
    // Render the add-drug view
    res.render("add-drug");
});

app.get("/reviews", ensureAuthenticated, async (req, res) => {
    try {
        // Find all reviews with viewed set to "false"
        const reviews = await Review.find({viewed: false});

        // Update the viewed property of the reviews to "true"
        await Review.updateMany({viewed: false}, {viewed: true});

        // Emit an 'update' event with the new reviews count
        const newReviewsCount = await Review.countDocuments({viewed: false});
        eventEmitter.emit('update', newReviewsCount);

        // Retrieve active and inactive reviews
        const activeReviews = await Review.find({active: true}).exec();
        const inactiveReviews = await Review.find({active: false}).exec();

        // Add stars as a new property to each review object
        const activeReviewsWithStars = activeReviews.map((review) => ({
            ...review.toObject(),
            stars: generateStars(review.rating),
        }));

        const inactiveReviewsWithStars = inactiveReviews.map((review) => ({
            ...review.toObject(),
            stars: generateStars(review.rating),
        }));

        // Render the reviews view with the retrieved data
        res.render("reviews", {
            activeReviews: activeReviewsWithStars,
            inactiveReviews: inactiveReviewsWithStars,
        });
    } catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
});

app.get("/contact-requests", ensureAuthenticated, async (req, res) => {
    try {
        // Update the viewed property of the contacts to "true"
        await Contact.updateMany({viewed: false}, {viewed: true});

        // Emit an 'update' event with the new contacts count
        const newContactsCount = await Contact.countDocuments({viewed: false});
        contactEventEmitter.emit('update', newContactsCount);

        // Retrieve persons to contact and contacted persons
        const personsToContact = await Contact.find({contacted: false}).exec();
        const contactedPersons = await Contact.find({contacted: true}).exec();

        // Render the contact view with the retrieved data
        res.render("contact", {personsToContact, contactedPersons});
    } catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
});

app.get('/contacts/count', async (req, res) => {
    try {
        // Count the number of new contacts
        const newContactsCount = await Contact.countDocuments({viewed: false});

        // Send the count as a JSON response
        res.json({count: newContactsCount});
    } catch (error) {
        console.error('Error fetching contact count:', error);
        res.status(500).json({error: 'Internal server error'});
    }
});

app.get('/api/patients/:id', async (req, res) => {
    const patientId = req.params.id;

    try {
        // Find the patient in the database based on the provided ID
        const patient = await Patient.findById(patientId);

        if (!patient) {
            return res.status(404).json({message: 'Patient not found'});
        }

        // Send the patient as a JSON response
        res.json(patient);
    } catch (error) {
        console.error(error);
        res.status(500).json({message: 'Internal server error'});
    }
});

app.get('/reviews/count', async (req, res) => {
    try {
        // Count the number of new reviews
        const newReviewsCount = await Review.countDocuments({viewed: false});

        // Send the count as a JSON response
        res.json({count: newReviewsCount});
    } catch (error) {
        console.error('Error fetching review count:', error);
        res.status(500).json({error: 'Internal server error'});
    }
});



// Post requests ..............

//This route is responsible for booking an appointment. It retrieves the necessary appointment details from the request body and updates an existing appointment or creates a new one. The updated or newly created appointment is then saved to the database.
app.post("/book-appointment", async (req, res) => {
    const idNumber = req.body.idNumber;
    const firstName = req.body.fName;
    const lastName = req.body.lName;
    const dateOfBirth = req.body.dateOfBirth;
    const gender = req.body.gender;
    const service = req.body.service;
    const date = req.body.date
    const time = req.body.time
    const email = req.body.email;
    const tel = req.body.tel;
    const paragraph = req.body.paragraph;

    try {
        const appointment = await Appointment.findOneAndUpdate(
            {idNumber: idNumber},
            {
                $set: {
                    fName: firstName,
                    lName: lastName,
                    dateOfBirth: dateOfBirth,
                    gender: gender,
                    service: service,
                    date: date,
                    time: time,
                    email: email,
                    tel: tel,
                    paragraph: paragraph,
                }
            },
            {upsert: true, new: true}
        );

        console.log('Appointment saved:', appointment);
        res.redirect("/book-appointment");
    } catch (error) {
        console.error('Error saving appointment:', error);
        res.status(500).send('Internal server error');
    }
})

//This route is similar to the previous one and is also used for booking appointments. It receives the form data from the request body and performs the same operations as the /book-appointment route. After saving the appointment, it sends a JSON response indicating the success status.
app.post('/online-appointment-booking', async (req, res) => {
    const formData = req.body.formData;
    console.log(formData)

    const idNumber = formData.idNumber;
    const firstName = formData.fName;
    const lastName = formData.lName;
    const gender = formData.gender;
    const date = formData.date;
    const time = formData.time;
    const email = formData.email;
    const tel = formData.tel;
    const paragraph = formData.paragraph;

    try {
        let appointment = await Appointment.findOneAndUpdate(
            {idNumber: idNumber},
            {
                $set: {
                    fName: firstName,
                    lName: lastName,
                    gender: gender,
                    date: date,
                    time: time,
                    email: email,
                    tel: tel,
                    paragraph: paragraph,
                },
            },
            {upsert: true, new: true}
        );

        console.log('Appointment saved:', appointment);

        // Send a JSON response indicating success
        res.status(200).json({message: 'Appointment saved successfully'});
    } catch (error) {
        console.error('Error saving appointment:', error);
        res.status(500).json({error: 'Internal server error'});
    }
});

//This route is used to add a new patient. It retrieves patient information from the request body and creates a new Patient object. The object is then saved to the database, and the route redirects the user to the /patients page.
app.post("/add-patient", (req, res) => {
    const idNumber = req.body.idNumber;
    const fName = req.body.fName;
    const lName = req.body.lName;
    const disease = req.body.disease;
    const tel = req.body.tel;
    const dateOfBirth = req.body.date;
    const age = req.body.age;
    const gender = req.body.gender;
    const email = req.body.email;
    const adress = req.body.adress;
    const note = req.body.paragraph;
    const lastVisit = req.body.lastVisit;
    const status = req.body.status;
    const employeeName = req.body.employeeName;

    const patient = new Patient({
        idNumber: idNumber,
        fName: fName,
        lName: lName,
        disease: disease,
        tel: tel,
        dateOfBirth: dateOfBirth,
        age: age,
        gender: gender,
        email: email,
        adress: adress,
        note: note,
        lastVisit: lastVisit,
        status: status,
        employeeName: employeeName,
    })

    patient.save();
    res.redirect("/patients")
})

//the route handler is using app.post() to handle HTTP POST requests to "/patient-profile". It extracts various data fields from the request body using req.body. The extracted fields are then used to update a Patient document in a database using Patient.findOneAndUpdate().
app.post("/patient-profile", (req, res) => {
    // Extracting data from the request body
    const patientId = req.body.patientId;
    const idNumber = req.body.idNumber;
    const fName = req.body.fName;
    const lName = req.body.lName;
    const tel = req.body.tel;
    const age = req.body.age;
    const gender = req.body.gender;
    const email = req.body.email;
    const disease = req.body.disease;
    const dateOfBirth = req.body.dateOfBirth;
    const adress = req.body.adress;
    const height = req.body.height;
    const weight = req.body.weight;
    const dominantHand = req.body.dominantHand;
    const xRays = req.body.xRays;
    const primaryPhysicianName = req.body.primaryPhysicianName;
    const clinicName = req.body.clinicName;
    const latexAllergy = req.body.latexAllergy;
    const rightShoulder = req.body.rightShoulder;
    const leftShoulder = req.body.leftShoulder;
    const rightElbow = req.body.rightElbow;
    const leftElbow = req.body.leftElbow;
    const rightWrist = req.body.rightWrist;
    const leftWrist = req.body.leftWrist;
    const rightHand = req.body.rightHand;
    const leftHand = req.body.leftHand;
    const rightKnee = req.body.rightKnee;
    const leftKnee = req.body.leftKnee;
    const rightAnkle = req.body.rightAnkle;
    const leftAnkle = req.body.leftAnkle;
    const rightFoot = req.body.rightFoot;
    const leftFoot = req.body.leftFoot;
    const neck = req.body.neck;
    const back = req.body.Back;
    const days = req.body.days;
    const weeks = req.body.weeks;
    const months = req.body.months;
    const years = req.body.years;
    const problemLikeThisBefore = req.body.problemLikeThisBefore;
    const injuryDate1 = req.body.injuryDate1;
    const injuryDate2 = req.body.injuryDate2;
    const injuryDate3 = req.body.injuryDate3;
    const injuryDate4 = req.body.injuryDate4;
    const injurySport = req.body.injurySport;
    const injurySchool = req.body.injurySchool;
    const outerGroup = req.body.outerGroup;
    const nestedGroup1 = req.body.nestedGroup1;
    const message1 = req.body.message;
    const painRating = req.body.painRating;
    const sharp = req.body.sharp;
    const dull = req.body.dull;
    const stabbing = req.body.stabbing;
    const throbbing = req.body.throbbing;
    const aching = req.body.aching;
    const burning = req.body.burning;
    const thePainIs = req.body.thePainIs;
    const wakeYou = req.body.wakeYou;
    const swelling = req.body.swelling;
    const bruises = req.body.bruises;
    const numbness = req.body.numbness;
    const tingling = req.body.tingling;
    const weakness = req.body.weakness;
    const givingWay = req.body.givingWay;
    const lockingCatching = req.body.lockingCatching;
    const gettingBetter = req.body.gettingBetter;
    const gettingWorse = req.body.gettingWorse;
    const unchanged = req.body.unchanged;
    const standing = req.body.standing;
    const walking = req.body.walking;
    const lifting = req.body.lifting;
    const exercise = req.body.exercise;
    const twisting = req.body.twisting;
    const lyingInBed = req.body.lyingInBed;
    const bending = req.body.bending;
    const squatting = req.body.squatting;
    const kneeling = req.body.kneeling;
    const stairs = req.body.stairs;
    const sitting = req.body.sitting;
    const coughing = req.body.coughing;
    const sneezing = req.body.sneezing;
    const rest = req.body.rest;
    const elevation = req.body.elevation;
    const heat = req.body.heat;
    const ice = req.body.ice;
    const other = req.body.other;
    const medications = req.body.medications;
    const allergicToMedic = req.body.allergicToMedic;
    const reaction = req.body.reaction;
    const injection = req.body.injection;
    const brace = req.body.brace;
    const physicalTherapy = req.body.physicalTherapy;
    const caneCrutch = req.body.caneCrutch;
    const seenInTheER = req.body.seenInTheER;
    const whichER = req.body.whichER;
    const erVisit = req.body.erVisit;
    const whoSawYouInER = req.body.whoSawYouInER;
    const mRI = req.body.mRI;
    const catScan = req.body.catScan;
    const boneScan = req.body.boneScan;
    const nerveTest = req.body.nerveTest;
    const otherScan = req.body.otherScan;
    const hadSurgery = req.body.hadSurgery;
    const procedure1 = req.body.procedure1;
    const surgeon1 = req.body.surgeon1;
    const city1 = req.body.city1;
    const date1 = req.body.date1;
    const procedure2 = req.body.procedure2;
    const surgeon2 = req.body.surgeon2;
    const city2 = req.body.city2;
    const date2 = req.body.date2;
    const regular = req.body.regular;
    const lightDuty = req.body.lightDuty;
    const notWorking = req.body.notWorking;
    const disabled = req.body.disabled;
    const retired = req.body.retired;
    const isStudent = req.body.isStudent;
    const lastWorkDate = req.body.lastWorkDate;
    const priorProblem = req.body.priorProblem;
    const priorProblemDescribe = req.body.priorProblemDescribe;
    const morningStiffness = req.body.morningStiffness;
    const jointPain = req.body.jointPain;
    const backPain = req.body.backPain;
    const gout = req.body.gout;
    const rheumatoidArthritis = req.body.rheumatoidArthritis;
    const priorFracture = req.body.priorFracture;
    const priorFractureBone = req.body.priorFractureBone;
    const heartburn = req.body.heartburn;
    const nausea = req.body.nausea;
    const bloodInStool = req.body.bloodInStool;
    const liverDisease = req.body.liverDisease;
    const year1 = req.body.year1;
    const thyroidDisease = req.body.thyroidDisease;
    const heatOrColdIntolerance = req.body.heatOrColdIntolerance;
    const year2 = req.body.year2;
    const weightLoss = req.body.weightLoss;
    const lossOfAppetite = req.body.lossOfAppetite;
    const year3 = req.body.year3;
    const blurredVision = req.body.blurredVision;
    const doubleVision = req.body.doubleVision;
    const visionLoss = req.body.visionLoss;
    const year4 = req.body.year4;
    const hearingLoss = req.body.hearingLoss;
    const hoarseness = req.body.hoarseness;
    const troubleSwallowing = req.body.troubleSwallowing;
    const year5 = req.body.year5;
    const chestPain = req.body.chestPain;
    const palpitations = req.body.palpitations;
    const year6 = req.body.year6;
    const chronicCough = req.body.chronicCough;
    const shortnessOfBreath = req.body.shortnessOfBreath;
    const year7 = req.body.year7;
    const painfulUrination = req.body.painfulUrination;
    const bloodInUrine = req.body.bloodInUrine;
    const kidneyProblems = req.body.kidneyProblems;
    const year8 = req.body.year8;
    const frequentRashes = req.body.frequentRashes;
    const lumps = req.body.lumps;
    const skinUlcers = req.body.skinUlcers;
    const psoriasis = req.body.psoriasis;
    const year9 = req.body.year9;
    const headaches = req.body.headaches;
    const dizziness = req.body.dizziness;
    const seizures = req.body.seizures;
    const year10 = req.body.year10;
    const depression = req.body.depression;
    const drugAlcoholAddiction = req.body.drugAlcoholAddiction;
    const sleepDisorder = req.body.sleepDisorder;
    const year11 = req.body.year11;
    const easyBleeding = req.body.easyBleeding;
    const easyBruising = req.body.easyBruising;
    const anemia = req.body.anemia;
    const year12 = req.body.year12;
    const symptomsDescribe = req.body.symptomsDescribe;
    const hivPositive = req.body.hivPositive;
    const diabetic = req.body.diabetic;
    const insulin = req.body.insulin;
    const oralMeds = req.body.oralMeds;
    const diet = req.body.diet;
    const bloodThinners = req.body.bloodThinners;
    const whichOne = req.body.whichOne;
    const pastSurgicalHistory = req.body.pastSurgicalHistory;
    const anesthesia = req.body.anesthesia;
    const anesthesiaExplain = req.body.anesthesiaExplain;
    const hospitalizations = req.body.hospitalizations;
    const heartAttack = req.body.heartAttack;
    const heartAttackYear = req.body.heartAttackYear;
    const highBloodPressure = req.body.highBloodPressure;
    const bloodClots = req.body.bloodClots;
    const bloodClotsYear = req.body.bloodClotsYear;
    const stroke = req.body.stroke;
    const heartFailure = req.body.heartFailure;
    const ankleSwelling = req.body.ankleSwelling;
    const kidneyfailure = req.body.kidneyfailure;
    const cancer = req.body.cancer;
    const cancerlocation = req.body.cancerlocation;
    const stomachache = req.body.stomachache;
    const antiInflammatories = req.body.antiInflammatories;
    const iDoNotHaveAny = req.body.iDoNotHaveAny;
    const directRelatives = req.body.directRelatives;
    const directRelativesDiabetes = req.body.directRelativesDiabetes;
    const directRelativesHighBloodPressure = req.body.directRelativesHighBloodPressure;
    const directRelativesRheumatoidArthritis = req.body.directRelativesRheumatoidArthritis;
    const sameCondition = req.body.sameCondition;
    const tobacco = req.body.tobacco;
    const packsPerDay = req.body.packsPerDay;
    const smokingRisk = req.body.smokingRisk;
    const alcoholUse = req.body.alcoholUse;
    const daily = req.body.daily;
    const alcoholPerWeek = req.body.alcoholPerWeek;
    const maritalHistory = req.body.maritalHistory;
    const peopleLiveWith = req.body.peopleLiveWith;
    const occupation = req.body.occupation;
    const student = req.body.student;
    const employer = req.body.employer;
    const workingPlan = req.body.workingPlan;
    // Updating the Patient document in the database
    Patient.findOneAndUpdate({_id: patientId}, {
        idNumber: idNumber,
        fName: fName,
        lName: lName,
        tel: tel,
        age: age,
        gender: gender,
        email: email,
        disease: disease,
        dateOfBirth: dateOfBirth,
        adress: adress,
        height: height,
        weight: weight,
        dominantHand: dominantHand,
        xRays: xRays,
        primaryPhysicianName: primaryPhysicianName,
        clinicName: clinicName,
        latexAllergy: latexAllergy,
        body_part: {
            rightShoulder: rightShoulder,
            leftShoulder: leftShoulder,
            rightElbow: rightElbow,
            leftElbow: leftElbow,
            rightWrist: rightWrist,
            leftWrist: leftWrist,
            rightHand: rightHand,
            leftHand: leftHand,
            rightKnee: rightKnee,
            leftKnee: leftKnee,
            rightAnkle: rightAnkle,
            leftAnkle: leftAnkle,
            rightFoot: rightFoot,
            leftFoot: leftFoot,
            neck: neck,
            back: back,
        },
        howLongAgoDidItStart: {
            days: days,
            weeks: weeks,
            months: months,
            years: years,
        },
        haveYouHadAProblemLikeThisBefore: problemLikeThisBefore,
        injuries: {
            main_group: outerGroup,
            nested_group_1: {
                input_type: nestedGroup1,
                additional_inputs: {
                    sport_input: injurySport,
                    school_input: injurySchool,
                    date_input1: injuryDate1,
                    date_input2: injuryDate2,
                    date_input3: injuryDate3,
                    date_input4: injuryDate4,
                    comment_input: message1
                },
            },
        },
        painRating: painRating,
        quality: {
            sharp: sharp,
            dull: dull,
            stabbing: stabbing,
            throbbing: throbbing,
            aching: aching,
            burning: burning
        },
        thePainIs: thePainIs,
        wakeYou: wakeYou,
        symptoms: {
            swelling: swelling,
            bruises: bruises,
            numbness: numbness,
            tingling: tingling,
            weakness: weakness,
            givingWay: givingWay,
            lockingCatching: lockingCatching,
            heartburn: heartburn,
            nausea: nausea,
            bloodInStool: bloodInStool,
            liverDisease: liverDisease,
            year1: year1,
            thyroidDisease: thyroidDisease,
            heatOrColdIntolerance: heatOrColdIntolerance,
            year2: year2,
            weightLoss: weightLoss,
            lossOfAppetite: lossOfAppetite,
            year3: year3,
            blurredVision: blurredVision,
            doubleVision: doubleVision,
            visionLoss: visionLoss,
            year4: year4,
            hearingLoss: hearingLoss,
            hoarseness: hoarseness,
            troubleSwallowing: troubleSwallowing,
            year5: year5,
            chestPain: chestPain,
            palpitations: palpitations,
            year6: year6,
            chronicCough: chronicCough,
            shortnessOfBreath: shortnessOfBreath,
            year7: year7,
            painfulUrination: painfulUrination,
            bloodInUrine: bloodInUrine,
            kidneyProblems: kidneyProblems,
            year8: year8,
            frequentRashes: frequentRashes,
            lumps: lumps,
            skinUlcers: skinUlcers,
            psoriasis: psoriasis,
            year9: year9,
            headaches: headaches,
            dizziness: dizziness,
            seizures: seizures,
            year10: year10,
            depression: depression,
            drugAlcoholAddiction: drugAlcoholAddiction,
            sleepDisorder: sleepDisorder,
            year11: year11,
            easyBleeding: easyBleeding,
            easyBruising: easyBruising,
            anemia: anemia,
            year12: year12,
            symptomsDescribe: symptomsDescribe,
            smokingRisk: smokingRisk,
            gettingBetter: gettingBetter,
            gettingWorse: gettingWorse,
            unchanged: unchanged,
            standing: standing,
            walking: walking,
            lifting: lifting,
            exercise: exercise,
            twisting: twisting,
            lyingInBed: lyingInBed,
            bending: bending,
            squatting: squatting,
            kneeling: kneeling,
            stairs: stairs,
            sitting: sitting,
            coughing: coughing,
            sneezing: sneezing,
            restt: rest,
            elevation: elevation,
            heat: heat,
            ice: ice,
            mri: mRI,
            catScan: catScan,
            boneScan: boneScan,
            nerveTest: nerveTest,
            insulin: insulin,
            oralMeds: oralMeds,
            diet: diet,
            heartAttack: heartAttack,
            highBloodPressure: highBloodPressure,
            bloodClots: bloodClots,
            stroke: stroke,
            heartFailure: heartFailure,
            ankleSwelling: ankleSwelling,
            kidneyfailure: kidneyfailure,
            cancer: cancer,
            stomachache: stomachache,
            iDoNotHaveAny: iDoNotHaveAny,
            directRelativesDiabetes: directRelativesDiabetes,
            directRelativesHighBloodPressure: directRelativesHighBloodPressure,
            directRelativesRheumatoidArthritis: directRelativesRheumatoidArthritis,
            student: student,
        },

        other: other,
        treatment: {
            injection: injection,
            brace: brace,
            physicalTherapy: physicalTherapy,
            caneCrutch: caneCrutch,
        },
        medications: medications,
        allergicToMedic: allergicToMedic,
        reaction: reaction,
        seenInTheER: seenInTheER,
        whichER: whichER,
        erVisit: erVisit,
        whoSawYouInER: whoSawYouInER,
        otherScan: otherScan,
        hadSurgery: hadSurgery,
        procedure1: procedure1,
        surgeon1: surgeon1,
        city1: city1,
        date1: date1,
        procedure2: procedure2,
        surgeon2: surgeon2,
        city2: city2,
        date2: date2,
        workStatus: {
            regular: regular,
            lightDuty: lightDuty,
            notWorking: notWorking,
            disabled: disabled,
            retired: retired,
            isStudent: isStudent
        },
        lastWorkDate: lastWorkDate,
        priorProblem: {
            hasPriorProblem: priorProblem,
            description: priorProblemDescribe
        },
        otherJoints: {
            morningStiffness: morningStiffness,
            jointPain: jointPain,
            backPain: backPain,
            gout: gout,
            rheumatoidArthritis: rheumatoidArthritis,
            priorFracture: priorFracture,
            priorFractureBone: priorFractureBone
        },
        hivPositive: hivPositive,
        diabetic: diabetic,
        bloodThinners: bloodThinners,
        whichOne: whichOne,
        pastSurgicalHistory: pastSurgicalHistory,
        anesthesia: anesthesia,
        anesthesiaExplain: anesthesiaExplain,
        hospitalizations: hospitalizations,
        heartAttackYear: heartAttackYear,
        bloodClotsYear: bloodClotsYear,
        cancerlocation: cancerlocation,
        antiInflammatories: antiInflammatories,
        directRelatives: directRelatives,
        sameCondition: sameCondition,
        tobacco: tobacco,
        packsPerDay: packsPerDay,
        alcoholUse: alcoholUse,
        daily: daily,
        alcoholPerWeek: alcoholPerWeek,
        maritalHistory: maritalHistory,
        peopleLiveWith: peopleLiveWith,
        occupation: occupation,
        employer: employer,
        workingPlan: workingPlan
    }, {new: true}, (err, doc) => {
        if (err) throw err;
        // console.log(doc);
    });
    res.redirect('/patients')
})

app.post("/add-drug", async (req, res) => {
    // Destructure the request body to extract the required data
    const {
        idNumber,
        drugName,
        category,
        companyName,
        purchaseDate,
        price,
        expense,
        expiredDate,
        stock,
        description,
        employeeName,
    } = req.body;

    try {
        // Parse the expense and stock values as floats
        const parsedExpense = parseFloat(expense);
        const parsedStock = parseFloat(stock);

        // Check if the parsed values are valid numbers
        if (isNaN(parsedExpense) || isNaN(parsedStock)) {
            throw new Error("Invalid expense or stock value");
        }

        // Calculate the total price of the quantity purchased
        const thePriceOfTheQuantityPurchased = parsedExpense * parsedStock;

        // Find and update the drug record in the database
        let drug = await Drug.findOneAndUpdate(
            { idNumber: idNumber },
            {
                $set: {
                    drugName: drugName,
                    category: category,
                    companyName: companyName,
                    purchaseDate: purchaseDate,
                    expiredDate: expiredDate,
                    price: price,
                    expense: parsedExpense,
                    stock: parsedStock,
                    description: description,
                    employeeName: employeeName,
                    thePriceOfTheQuantityPurchased: thePriceOfTheQuantityPurchased,
                },
            },
            // Create a new document if it doesn't exist
            { upsert: true, new: true }
        );

        // Redirect to the "/drugs" route
        res.redirect("/drugs");
    } catch (err) {
        console.error(err);
        // Send a server error response
        res.status(500).send("Server Error");
    }
});

app.delete("/delete-appointment/:appointmentID", (req, res) => {
    // Extract the appointment ID from the request parameters
    const appointmentId = req.params.appointmentID;

    // Find and delete the appointment from the database
    Appointment.findOneAndDelete({ _id: appointmentId }, function (err, foundAppointment) {
        if (err) {
            console.log(err);
            // Send an error response if there was an issue deleting the appointment
            res.json({ success: false, message: 'Error deleting appointment.' });
        } else {
            // Create a new deleted appointment record with the details from the found appointment
            const canceledAppointment = new DeletedAppointment({
                idNumber: foundAppointment.idNumber,
                fName: foundAppointment.fName,
                lName: foundAppointment.lName,
                tel: foundAppointment.tel,
                service: foundAppointment.service,
                date: foundAppointment.date,
                time: foundAppointment.time,
            });

            // Save the canceled appointment record
            canceledAppointment.save(function (err) {
                if (err) {
                    console.log(err);
                    // Send an error response if there was an issue creating the new appointment record
                    res.json({ success: false, message: 'Error creating new appointment.' });
                } else {
                    console.log("Appointment moved successfully.");
                    // Send a success response
                    res.json({ success: true });
                }
            });
        }
    });
});

app.delete("/delete-invoice/:invoiceID", (req, res) => {
    // Extract the invoice ID from the request parameters
    const invoiceId = req.params.invoiceID;

    // Find and delete the invoice from the database
    Invoice.findOneAndDelete({ _id: invoiceId }, function (err, foundInvoice) {
        if (err) {
            console.log(err);
            // Send an error response if there was an issue deleting the invoice
            res.json({ success: false, message: 'Error deleting invoice.' });
        } else {
            console.log("Invoice removed successfully.");
            // Send a success response
            res.json({ success: true });
        }
    });
});

app.delete("/delete-drug/:drugID", (req, res) => {
    // Extract the drug ID from the request parameters
    const drugId = req.params.drugID;

    // Find and delete the drug from the database
    Drug.findOneAndDelete({ _id: drugId }, function (err, foundInvoice) {
        if (err) {
            console.log(err);
            // Send an error response if there was an issue deleting the drug
            res.json({ success: false, message: 'Error deleting drug.' });
        } else {
            console.log("Drug removed successfully.");
            // Send a success response
            res.json({ success: true });
        }
    });
});

app.delete("/delete-review/:reviewID", (req, res) => {
    // Extract the review ID from the request parameters
    const reviewId = req.params.reviewID;

    // Find and delete the review from the database
    Review.findOneAndDelete({ _id: reviewId }, function (err, foundReview) {
        if (err) {
            console.log(err);
            // Send an error response if there was an issue deleting the review
            res.json({ success: false, message: 'Error deleting review.' });
        } else {
            console.log("Review removed successfully.");
            // Send a success response
            res.json({ success: true });
        }
    });
});

app.delete("/delete-contact/:contactID", (req, res) => {
    // Extract the contact ID from the request parameters
    const contactId = req.params.contactID;

    // Find and delete the contact from the database
    Contact.findOneAndDelete({ _id: contactId }, function (err, foundContact) {
        if (err) {
            console.log(err);
            // Send an error response if there was an issue deleting the contact
            res.json({ success: false, message: 'Error deleting contact.' });
        } else {
            console.log("Contact removed successfully.");
            // Send a success response
            res.json({ success: true });
        }
    });
});

app.delete("/delete-patient/:patientID", (req, res) => {
    // Extract the patient ID from the request parameters
    const patientID = req.params.patientID;

    // Find and delete the patient from the database
    Patient.findOneAndDelete({ _id: patientID }, function (err, foundPatient) {
        if (err) {
            console.log(err);
            // Send an error response if there was an issue deleting the patient
            res.json({ success: false, message: 'Error deleting patient.' });
        } else {
            console.log("Patient removed successfully.");
            // Send a success response
            res.json({ success: true });
        }
    });
});
app.post("/active-review/:reviewID", async (req, res) => {
    // Extract the review ID from the request parameters
    const reviewId = req.params.reviewID;

    try {
        // Find the review in the database
        const foundReview = await Review.findOne({ _id: reviewId }).exec();

        if (!foundReview) {
            // Send an error response if the review is not found
            return res.json({ success: false, message: "Review not found." });
        }

        // Toggle the "active" property of the review
        foundReview.active = !foundReview.active;

        // Save the updated review
        await foundReview.save();

        console.log("Review activation status updated successfully.");
        // Send a success response
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        // Send an error response if there was an issue toggling the review activation
        res.json({ success: false, message: "Error toggling review activation." });
    }
});

app.post("/contact-person/:personID", async (req, res) => {
    // Extract the person ID from the request parameters
    const personId = req.params.personID;

    try {
        // Find the person in the database
        const foundPerson = await Contact.findOne({ _id: personId }).exec();

        if (!foundPerson) {
            // Send an error response if the person is not found
            return res.json({ success: false, message: "Person not found." });
        }

        // Toggle the "contacted" property of the person
        foundPerson.contacted = !foundPerson.contacted;

        // Save the updated person
        await foundPerson.save();

        console.log("Person connection status updated successfully.");
        // Send a success response
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        // Send an error response if there was an issue toggling the person connection
        res.json({ success: false, message: "Error toggling person connection." });
    }
});

app.delete("/del-past-appointment/:appointmentID", (req, res) => {
    // Extract the appointment ID from the request parameters
    const appointmentId = req.params.appointmentID;
    console.log(appointmentId);

    // Use Promise.all() to wait for both database operations to complete
    Promise.all([
        ApprovedAppointment.findOneAndDelete({ _id: appointmentId }).exec(),
        DeletedAppointment.findOneAndDelete({ _id: appointmentId }).exec()
    ])
        .then(([approvedAppointment, deletedAppointment]) => {
            // Send a success response to the client
            res.json({ success: true });
            console.log('Deleted approved appointment:', approvedAppointment);
            console.log('Deleted deleted appointment:', deletedAppointment);
        })
        .catch(err => {
            console.error(err);
            // Send an error response if there was an issue deleting the appointment
            res.json({ success: false, message: 'Error deleting appointment.' });
        });
});
app.post("/update-appointment", (req, res) => {
    // Extract data from the request body
    const appointmentId = req.body.appointmentID;
    const idNumber = req.body.idNumber;
    const fName = req.body.fName;
    const lName = req.body.lName;
    const tel = req.body.tel;
    const service = req.body.service;
    const date = req.body.date;
    const time = req.body.time;

    // Update the appointment with the new data
    Appointment.findOneAndUpdate(
        { _id: appointmentId },
        {
            idNumber: idNumber,
            fName: fName,
            lName: lName,
            tel: tel,
            service: service,
            date: date,
            time: time,
        },
        { new: true },
        (err, doc) => {
            if (err) throw err;
            console.log(doc);
        }
    );

    // Redirect to the book-appointment page
    res.redirect("/book-appointment");
});

app.post("/approve-appointment", (req, res) => {
    // Extract data from the request body
    const appointmentId = req.body.appointmentID;
    const idNumber = req.body.idNumber;
    const fName = req.body.fName;
    const lName = req.body.lName;
    const tel = req.body.tel;
    const service = req.body.service;
    const date = req.body.date;
    const time = req.body.time;
    const gender = req.body.gender;

    const filter = { idNumber: idNumber };
    const update = {
        $set: {
            fName: fName,
            lName: lName,
            disease: service,
            date: date,
            time: time,
            tel: tel,
            gender: gender,
            status: "Pending",
        },
    };
    const options = { upsert: true, new: true };

    // Update the patient information
    Patient.findOneAndUpdate(filter, update, options, function (err, patient) {
        if (err) {
            console.log(err);
        } else {
            console.log("Patient updated successfully.");
        }
    });

    // Create a new approved appointment
    const approvedAppointment = new ApprovedAppointment({
        idNumber: idNumber,
        fName: fName,
        lName: lName,
        service: service,
        date: date,
        time: time,
        tel: tel,
    });
    approvedAppointment.save();

    // Delete the original appointment
    Appointment.deleteOne({ _id: appointmentId }, function (err) {
        if (err) {
            console.log(err);
        } else {
            console.log("Document approved successfully.");
        }
    });

    // Redirect to the book-appointment page
    res.redirect("/book-appointment");
});

app.post('/clinic-info', async (req, res) => {
    // Extract clinic data from the request body
    const clinicData = {
        idNumber: req.body.idNumber,
        name: req.body.clinicName,
        address: req.body.clinicAddress,
        city: req.body.city,
        state: req.body.state,
        phone: req.body.clinicPhone,
        email: req.body.clinicEmail,
        clinicType: req.body.clinicType,
        clinicMessage: req.body.clinicMessage,
        // clinicLogo: req.file.path
    };

    try {
        // Create a new clinic document with the clinicData
        const newClinic = await Clinic.create(clinicData);

        // Find any existing clinic document with a different idNumber
        const existingClinic = await Clinic.findOne({ idNumber: { $ne: clinicData.idNumber } });

        if (existingClinic) {
            await existingClinic.remove(); // Delete any existing clinic document with a different idNumber
        }

        // Redirect to the account-settings page
        res.redirect("/account-settings");
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});
app.post('/doctor-info', function (req, res) {
    // Extract doctor data from the request body
    const doctorData = {
        idNumber: req.body.idNumber,
        fName: req.body.fName,
        username: req.body.email,
        lName: req.body.lName,
        email: req.body.email,
        tel: req.body.tel,
        company: req.body.company,
        companyWebsite: req.body.companyWebsite,
        specialty: req.body.specialty,
        // doctorPhoto: req.file.path,
        experience: req.body.experience,
        address: {
            street: req.body.street,
            city: req.body.city,
            state: req.body.state,
            zipCode: req.body.zipCode,
            country: req.body.country,
            timeZone: req.body.timeZone
        },
        schedule: req.body.schedule,
    };

    // Update the doctor information
    Doctor.findOneAndUpdate(
        { _id: { $ne: null } }, // Check if there is any existing document
        doctorData, // Update with new doctor data
        { upsert: true, new: true, overwrite: true }, // Create or update the existing document
        function (err, doc) {
            if (err) {
                return res.status(500).send(err);
            }
            res.redirect("/account-settings");
        }
    );
});

app.post('/social-media', function (req, res) {
    // Extract social media data from the request body
    const socialMediaData = {
        twitter: req.body.twitter,
        facebook: req.body.facebook,
        linkedIn: req.body.linkedIn
    };

    // Update the social media settings
    SettingSocialMedia.findOneAndUpdate(
        {}, // Empty filter to update any existing document
        { socialMedia: socialMediaData }, // Update the socialMedia field with the new data
        { upsert: true, new: true }, // Create a new document if it doesn't exist
        function (err, doc) {
            if (err) {
                return res.status(500).send(err);
            }
            res.redirect("/account-settings");
        }
    );
});

app.post('/doctor-photos', upload.single('doctorPhoto'), function (req, res) {
    // Create a new doctor photo document
    const doctorPhoto = new DoctorPhoto({
        doctorPhoto: req.file.path
    });

    // Save the doctor photo document
    doctorPhoto.save()
    res.redirect("/account-settings");
});

app.post('/clinic-photos', upload.single('clinicPhoto'), function (req, res) {
    // Create a new clinic photo document
    const clinicPhoto = new ClinicPhoto({
        clinicPhoto: req.file.path
    });

    // Save the clinic photo document
    clinicPhoto.save();
    res.redirect("/account-settings");
});

app.post('/patients/:id/invoices', (req, res) => {
    // Generate an invoice ID using the shortid library
    const invoice_Id = `#${shortid.generate()}`;

    // Extract invoice data from the request body
    const fullName = req.body.fullName;
    const { items } = req.body;
    const patientId = req.params.id;
    const invoiceDate = req.body.invoiceDate;
    const email = req.body.email;
    const terms = req.body.terms;

    // Create an array of invoice items
    const invoiceItems = items.map(({ itemName, description, unitCost, quantity }) => {
        return new InvoiceItem({
            itemName: itemName,
            description: description,
            unitCost: unitCost,
            quantity: quantity,
        });
    });

    // Calculate the total price, amount paid, and due amount
    const amountPaid = req.body.amountPaid;
    const totalPrice = invoiceItems.reduce((acc, item) => acc + item.total, 0);
    const due = totalPrice - amountPaid;

    // Create a new invoice document
    const invoice = new Invoice({
        invoiceId: invoice_Id,
        fullName: fullName,
        status: due > 0 ? "Pending" : "Paid",
        invoiceDate: invoiceDate,
        items: invoiceItems,
        totalPrice: totalPrice,
        amountPaid: amountPaid,
        due: due,
        email: email,
        terms: terms,
    });

    // Add the invoice to the patient's invoices array and save the invoice
    Patient.findByIdAndUpdate(
        patientId,
        { $push: { invoices: invoice } },
        { new: true },
        (err, patient) => {
            if (err) {
                console.log(err);
                res.status(500).send('Error adding invoice to patient');
            } else {
                invoice.save((err) => {
                    if (err) {
                        console.log(err);
                        res.status(500).send('Error saving invoice');
                    } else {
                        res.redirect('/patient-profile?id=' + patient._id); // Redirect to patient profile page with updated patient information
                    }
                });
            }
        }
    );
});

//sseConnections is an array that stores the response objects of connected clients.
const sseConnections = [];

//The sendEvent function is responsible for sending SSE events to all connected clients. It creates an SSE event with a message ("Email sent successfully") and sends it to each client using the res.write method.
function sendEvent() {
    const data = 'Email sent successfully';
    const event = `data: ${data}\n\n`;

    // Send the SSE event to all connected clients
    sseConnections.forEach((res) => {
        res.write(event);
    });

    console.log(`Sent SSE event: ${event}`);
}

// Create a separate route for SSE
app.get('/sse', (req, res) => {
    // Set the headers to enable SSE
    const headers = {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
    };

    // Set the response headers
    res.writeHead(200, headers);

    // Save the response object so we can send SSE events to it later
    sseConnections.push(res);

    console.log('Client connected to SSE');

    // Send a welcome message
    const event = `data: Welcome to the SSE endpoint\n\n`;
    res.write(event);

    // Handle the SSE connection closing
    req.on('close', () => {
        console.log('Client disconnected from SSE');
        // Remove the connection from the connections array
        const index = sseConnections.indexOf(res);
        if (index >= 0) {
            sseConnections.splice(index, 1);
        }
    });
});

app.post('/generate-pdf', async (req, res) => {
    try {
        const invoiceId = req.body.invoID;
        const patientId = req.body.patientID;
        const inv = await Invoice.findById(invoiceId);
        const pat = await Patient.findById(patientId);
        const doctor = await Doctor.findOne();
        const fName = pat.fName;
        const lName = pat.lName;
        const maskedFName = fName.substring(0, 2) + '*'.repeat(fName.length - 2);
        const maskedLName = lName.substring(0, 2) + '*'.repeat(lName.length - 2);
        const maskedName = `${maskedFName} ${maskedLName}`;

        // console.log(inv)

        if (!inv) {
            res.status(404).send('Invoice not found');
            return;
        }

        const invoice = {
            shipping: {
                name: maskedName,
            },
            items: inv.items.map(item => ({
                item: item.itemName,
                description: item.description,
                quantity: item.quantity,
                amount: item.unitCost
            })),
            subtotal: inv.totalPrice,
            paid: inv.amountPaid,
            invoice_nr: inv.invoiceId,
        };

        function createInvoice(invoice) {
            const doc = new PDFDocument({size: "A4", margin: 50});

            generateHeader(doc);
            generateCustomerInformation(doc, invoice);
            generateInvoiceTable(doc, invoice);
            generateFooter(doc);

            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfData = Buffer.concat(buffers);

                const attachment = {
                    content: pdfData.toString('base64'),
                    filename: 'invoice.pdf',
                    type: 'application/pdf',
                    disposition: 'attachment'
                };

                const msg = {
                    to: pat.email,
                    from: "roma7nce@hotmail.com",
                    subject: 'Invoice',
                    text: 'Please find the attached invoice.',
                    attachments: [attachment]
                };

                sgMail.send(msg)
                    .then(() => {
                        console.log('PDF generated and sent successfully');
                        sendEvent();
                    })
                    .catch((err) => {
                        console.log(err);
                        console.log('Error sending email');

                    });
            });

            // doc.pipe(res);
            doc.end();
        }

        function generateHeader(doc) {
            doc
                .image("logo.png", 50, 45, {width: 50})
                .fillColor("#444444")
                .fontSize(20)
                .text("ACME Inc.", 110, 57)
                .fontSize(10)
                .text("ACME Inc.", 200, 50, {align: "right"})
                .text(`${doctor.address.state}, ${doctor.address.street}`, 200, 65, {align: "right"})
                .text(`${doctor.address.city}, ${doctor.address.country}, ${doctor.address.zipCode}`, 200, 80, {align: "right"})
                .moveDown();
        }

        function generateCustomerInformation(doc, invoice) {
            doc
                .fillColor("#444444")
                .fontSize(20)
                .text("Invoice", 50, 160);

            generateHr(doc, 185);

            const customerInformationTop = 200;

            doc
                .fontSize(10)
                .text("Invoice Number:", 50, customerInformationTop)
                .font("Helvetica-Bold")
                .text(invoice.invoice_nr, 150, customerInformationTop)
                .font("Helvetica")
                .text("Invoice Date:", 50, customerInformationTop + 15)
                .text(formatDate(inv.invoiceDate), 150, customerInformationTop + 15)
                .text("Total:", 50, customerInformationTop + 30)
                .text(
                    (inv.totalPrice),
                    150,
                    customerInformationTop + 30
                )

                .font("Helvetica-Bold")
                .text(invoice.shipping.name, 300, customerInformationTop)
                .font("Helvetica")
                .moveDown();

            generateHr(doc, 252);
        }

        function generateInvoiceTable(doc, invoice) {
            let i;
            const invoiceTableTop = 330;

            doc.font("Helvetica-Bold");
            generateTableRow(
                doc,
                invoiceTableTop,
                "Item",
                "Description",
                "Unit Cost",
                "Quantity",
                "Line Total"
            );
            generateHr(doc, invoiceTableTop + 20);
            doc.font("Helvetica");

            for (i = 0; i < invoice.items.length; i++) {
                const item = invoice.items[i];
                const position = invoiceTableTop + (i + 1) * 30;
                generateTableRow(
                    doc,
                    position,
                    item.item,
                    item.description,
                    item.amount,
                    item.quantity,
                    (item.amount * item.quantity)
                );

                generateHr(doc, position + 20);
            }

            const subtotalPosition = invoiceTableTop + (i + 1) * 30;
            generateTableRow(
                doc,
                subtotalPosition,
                "",
                "",
                "Subtotal",
                "",
                inv.totalPrice
            );

            const paidToDatePosition = subtotalPosition + 20;
            generateTableRow(
                doc,
                paidToDatePosition,
                "",
                "",
                "Paid To Date",
                "",
                (inv.amountPaid)
            );

            const duePosition = paidToDatePosition + 25;
            doc.font("Helvetica-Bold");
            generateTableRow(
                doc,
                duePosition,
                "",
                "",
                "Balance Due",
                "",
                (inv.totalPrice - inv.amountPaid)
            );
            doc.font("Helvetica");
        }

        function generateFooter(doc) {
            doc
                .fontSize(10)
                .text(
                    inv.terms,
                    50,
                    780,
                    {align: "center", width: 500}
                );
        }

        function generateTableRow(
            doc,
            y,
            item,
            description,
            unitCost,
            quantity,
            lineTotal
        ) {
            doc
                .fontSize(10)
                .text(item, 50, y)
                .text(description, 150, y)
                .text(unitCost, 280, y, {width: 90, align: "right"})
                .text(quantity, 370, y, {width: 90, align: "right"})
                .text(lineTotal, 0, y, {align: "right"});
        }

        function generateHr(doc, y) {
            doc
                .strokeColor("#aaaaaa")
                .lineWidth(1)
                .moveTo(50, y)
                .lineTo(550, y)
                .stroke();
        }

        function formatCurrency(cents) {
            return "$" + (cents / 100).toFixed(2);
        }

        function formatDate(date) {
            return date;
        }

        createInvoice(invoice, "invoice.pdf");
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal server error');
    }
});

app.post('/download-pdf', async (req, res) => {
    try {
        const invoiceId = req.body.invoID;
        const patientId = req.body.patientID;
        const inv = await Invoice.findById(invoiceId);
        const pat = await Patient.findById(patientId);
        const doctor = await Doctor.findOne();
        const fName = pat.fName;
        const lName = pat.lName;
        const maskedFName = fName.substring(0, 2) + '*'.repeat(fName.length - 2);
        const maskedLName = lName.substring(0, 2) + '*'.repeat(lName.length - 2);
        const maskedName = `${maskedFName} ${maskedLName}`;

        // console.log(inv)

        if (!inv) {
            res.status(404).send('Invoice not found');
            return;
        }

        const invoice = {
            shipping: {
                name: maskedName,
            },
            items: inv.items.map(item => ({
                item: item.itemName,
                description: item.description,
                quantity: item.quantity,
                amount: item.unitCost
            })),
            subtotal: inv.totalPrice,
            paid: inv.amountPaid,
            invoice_nr: inv.invoiceId,
        };

        function createInvoice(invoice) {
            const doc = new PDFDocument({size: "A4", margin: 50});

            generateHeader(doc);
            generateCustomerInformation(doc, invoice);
            generateInvoiceTable(doc, invoice);
            generateFooter(doc);

            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfData = Buffer.concat(buffers);

            });
            res.setHeader("Content-Disposition", `attachment; filename=invoice.pdf`);
            res.setHeader("Content-Type", "application/pdf");

            // Write the PDF data to the response object
            doc.pipe(res);

            doc.end();
        }

        function generateHeader(doc) {
            doc
                .image("logo.png", 50, 45, {width: 50})
                .fillColor("#444444")
                .fontSize(20)
                .text("ACME Inc.", 110, 57)
                .fontSize(10)
                .text("ACME Inc.", 200, 50, {align: "right"})
                .text(`${doctor.address.state}, ${doctor.address.street}`, 200, 65, {align: "right"})
                .text(`${doctor.address.city}, ${doctor.address.country}, ${doctor.address.zipCode}`, 200, 80, {align: "right"})
                .moveDown();
        }

        function generateCustomerInformation(doc, invoice) {
            doc
                .fillColor("#444444")
                .fontSize(20)
                .text("Invoice", 50, 160);

            generateHr(doc, 185);

            const customerInformationTop = 200;

            doc
                .fontSize(10)
                .text("Invoice Number:", 50, customerInformationTop)
                .font("Helvetica-Bold")
                .text(invoice.invoice_nr, 150, customerInformationTop)
                .font("Helvetica")
                .text("Invoice Date:", 50, customerInformationTop + 15)
                .text(formatDate(inv.invoiceDate), 150, customerInformationTop + 15)
                .text("Total:", 50, customerInformationTop + 30)
                .text(
                    (inv.totalPrice),
                    150,
                    customerInformationTop + 30
                )

                .font("Helvetica-Bold")
                .text(invoice.shipping.name, 300, customerInformationTop)
                .font("Helvetica")
                .moveDown();

            generateHr(doc, 252);
        }

        function generateInvoiceTable(doc, invoice) {
            let i;
            const invoiceTableTop = 330;

            doc.font("Helvetica-Bold");
            generateTableRow(
                doc,
                invoiceTableTop,
                "Item",
                "Description",
                "Unit Cost",
                "Quantity",
                "Line Total"
            );
            generateHr(doc, invoiceTableTop + 20);
            doc.font("Helvetica");

            for (i = 0; i < invoice.items.length; i++) {
                const item = invoice.items[i];
                const position = invoiceTableTop + (i + 1) * 30;
                generateTableRow(
                    doc,
                    position,
                    item.item,
                    item.description,
                    item.amount,
                    item.quantity,
                    (item.amount * item.quantity)
                );

                generateHr(doc, position + 20);
            }

            const subtotalPosition = invoiceTableTop + (i + 1) * 30;
            generateTableRow(
                doc,
                subtotalPosition,
                "",
                "",
                "Subtotal",
                "",
                inv.totalPrice
            );

            const paidToDatePosition = subtotalPosition + 20;
            generateTableRow(
                doc,
                paidToDatePosition,
                "",
                "",
                "Paid To Date",
                "",
                (inv.amountPaid)
            );

            const duePosition = paidToDatePosition + 25;
            doc.font("Helvetica-Bold");
            generateTableRow(
                doc,
                duePosition,
                "",
                "",
                "Balance Due",
                "",
                (inv.totalPrice - inv.amountPaid)
            );
            doc.font("Helvetica");
        }

        function generateFooter(doc) {
            doc
                .fontSize(10)
                .text(
                    inv.terms,
                    50,
                    780,
                    {align: "center", width: 500}
                );
        }

        function generateTableRow(
            doc,
            y,
            item,
            description,
            unitCost,
            quantity,
            lineTotal
        ) {
            doc
                .fontSize(10)
                .text(item, 50, y)
                .text(description, 150, y)
                .text(unitCost, 280, y, {width: 90, align: "right"})
                .text(quantity, 370, y, {width: 90, align: "right"})
                .text(lineTotal, 0, y, {align: "right"});
        }

        function generateHr(doc, y) {
            doc
                .strokeColor("#aaaaaa")
                .lineWidth(1)
                .moveTo(50, y)
                .lineTo(550, y)
                .stroke();
        }

        function formatCurrency(cents) {
            return "$" + (cents / 100).toFixed(2);
        }

        function formatDate(date) {
            return date;
        }

        createInvoice(invoice, "invoice.pdf");
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal server error');
    }
});

app.post('/update-theme', async (req, res) => {
    try {
        const { themeValue } = req.body;

        // Fetch the current user preferences from the database
        const currentPrefs = await UserPreferences.findOne({});
        const currentThemeValue = currentPrefs ? currentPrefs.themeValue : null;

        // Check if the new theme value is the same as the current one
        if (currentThemeValue === themeValue) {
            res.json(currentThemeValue); // No change in theme value
            return;
        }

        // Update the theme value in the user preferences
        const updatedPrefs = await UserPreferences.findOneAndUpdate(
            {},
            {
                $set: {
                    themeValue: themeValue,
                }
            }, // Update 'themeValue'
            { new: true, upsert: true }
        );

        res.json(updatedPrefs);
        console.log(updatedPrefs)
        console.log(updatedPrefs.themeValue)
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.post('/update-sidebar', async (req, res) => {
    const sidebarMini = req.body.sidebarMini === 'true';
    try {
        // Update the sidebarMini value in the user preferences
        const updatedPrefs = await UserPreferences.findOneAndUpdate(
            {},
            {
                $set: {
                    sidebarMini: sidebarMini,
                }
            }, // Update 'sidebarMini'
            { new: true, upsert: true }
        );

        res.json(updatedPrefs);
        // console.log(updatedPrefs)
        // console.log(updatedPrefs.themeValue)
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});
app.post("/user-prefrences", async (req, res) => {
    const hMenu = req.body.h_menu === 'true';
    const themeRtl = req.body.themeRtl === 'true';
    const headerFixed = req.body.headerFixed === 'true';
    const headerDarkMode = req.body.headerDarkMode === 'true';
    const borderRadios = req.body.borderRadios === 'true';
    const sidebarDark = req.body.sidebarDark === 'true';
    const checkImage = req.body.checkImage === 'true';
    const fluidLayout = req.body.fluidLayout === 'true';
    const cardShadow = req.body.cardShadow === 'true';

    try {
        const {
            theme, themeValue, font, pic
        } = req.body;

        // Find the user preferences document and retrieve the current pic value
        const currentPrefs = await UserPreferences.findOne({});
        const currentPic = currentPrefs ? currentPrefs.pic : null;
        const currentThemeValue = currentPrefs ? currentPrefs.themeValue : null;

        // Check if the submitted form has a pic value, if not, use the currentPic value
        const updatedPic = pic ? pic : currentPic;
        const updatedThemeValue = themeValue ? themeValue : currentThemeValue;

        // Find the user preferences document and update it with the new values
        const updatedPrefs = await UserPreferences.findOneAndUpdate(
            {}, // Find any document
            {
                $set: {
                    theme,
                    themeValue: updatedThemeValue,
                    themeRtl,
                    font,
                    h_menu: hMenu,
                    headerFixed,
                    headerDarkMode,
                    borderRadios,
                    sidebarDark,
                    checkImage,
                    fluidLayout,
                    pic: updatedPic,
                    cardShadow,
                },
            },
            { new: true, upsert: true }, // Return the updated document or create a new one if none exist
        );

        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

const reviewEmitter = new EventEmitter();

// Endpoint for submitting a review
app.post("/rate", async (req, res) => {
    const formData = req.body.formData;
    console.log(formData);
    const rating = formData.rating;
    const name = formData.name;
    const profession = formData.profession;
    const city = formData.city;
    const review = formData.review;

    try {
        const newReview = new Review({
            rating: rating,
            name: name,
            profession: profession,
            city: city,
            review: review,
        });

        const savedReview = await newReview.save();

        console.log('Review saved:', savedReview);

        // Emit an SSE event with the saved review
        reviewEmitter.emit('newReview', savedReview);

        // Send a JSON response indicating success
        res.status(200).json({ message: 'Review saved successfully' });
    } catch (error) {
        console.error('Error saving review:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Server-Sent Events endpoint for receiving new reviews
app.get('/sse/reviews', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const listener = (newReview) => {
        // Send the new review to the client as an SSE event
        res.write(`data: ${JSON.stringify(newReview)}\n\n`);
    };

    // Listen for 'newReview' events
    reviewEmitter.on('newReview', listener);

    // Remove the listener when the client closes the SSE connection
    req.on('close', () => {
        reviewEmitter.off('newReview', listener);
    });
});

// Endpoint for submitting a contact form
app.post("/contact", async (req, res) => {
    const formData = req.body.formData;
    const name = formData.name;
    const email = formData.email;
    const tel = formData.tel;
    const message = formData.message;

    try {
        const newContact = new Contact({
            name: name,
            email: email,
            tel: tel,
            message: message,
        });

        const savedContact = await newContact.save();

        // Emit an SSE event with the saved contact
        contactEmitter.emit('newContact', savedContact);

        // Send a JSON response indicating success
        res.status(200).json({message: 'Contact saved successfully'});
    } catch (error) {
        console.error('Error saving contact:', error);
        res.status(500).json({error: 'Internal server error'});
    }
});

// Server-Sent Events endpoint for receiving new contacts
app.get('/sse/contacts', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const listener = (newContact) => {
        // Send the new contact to the client as an SSE event
        res.write(`data: ${JSON.stringify(newContact)}\n\n`);
    };

    // Listen for 'newContact' events
    contactEmitter.on('newContact', listener);

    // Remove the listener when the client closes the SSE connection
    req.on('close', () => {
        contactEmitter.off('newContact', listener);
    });
});


// Endpoint for updating the last visit of a patient
app.post('/patients/:id/lastvisit', async (req, res) => {
    const formData = req.body.formData;
    console.log(formData);

    const patientId = req.params.id;
    const {reason, date, time, note} = formData;

    try {
        const patient = await Patient.findById(patientId);
        if (!patient) {
            return res.status(404).send("Patient not found");
        }

        const lastVisit = {
            patientId,
            date,
            time,
            note,
            reason
        };

        patient.lastVisit.push(lastVisit);
        await patient.save();

        const newLastVisit = new LastVisit(lastVisit);
        await newLastVisit.save();

        res.json({success: true});
    } catch (error) {
        console.error(error);
        res.status(500).json({error: 'Failed to update last visit'});
    }
});

// Endpoint for user login
app.post('/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            console.error(err);
            return next(err);
        }
        if (!user) {
            // User authentication failed, show error message on login page
            req.flash('error', 'Incorrect email or password');
            return res.redirect('/login');
        }
        req.logIn(user, (err) => {
            if (err) {
                console.error(err);
                return next(err);
            }
            return res.redirect('/dashboard');
        });
    })(req, res, next);
});

// Endpoint for creating a new todo item
app.post('/todos', (req, res) => {
    const {text} = req.body;

    if (!text) {
        return res.status(400).json({error: 'Text is required'});
    }

    Todo.create({text})
        .then(todo => {
            res.status(201).json(todo);
        })
        .catch(error => {
            res.status(500).json({error: 'Failed to create todo item'});
        });
});

// Endpoint for updating the status of a todo item
app.put('/todos/:id', (req, res) => {
    const {id} = req.params;

    Todo.findById(id)
        .then(todo => {
            todo.done = !todo.done;
            return todo.save();
        })
        .then(updatedTodo => {
            res.json(updatedTodo);
        })
        .catch(error => {
            res.status(500).json({error: 'Failed to update todo item'});
        });
});

// Endpoint for deleting a todo item
app.delete('/todos/:id', (req, res) => {
    const {id} = req.params;

    Todo.findByIdAndDelete(id)
        .then(() => {
            res.sendStatus(204);
        })
        .catch(error => {
            res.status(500).json({error: 'Failed to delete todo item'});
        });
});

// Endpoint for updating the status of a patient
app.post('/patients/:id/updateStatus', (req, res) => {
    const patientId = req.params.id;
    const newStatus = req.body.status;

    // Update the patient status in the database using Mongoose or any other ORM you are using
    // For example, using Mongoose:
    Patient.findByIdAndUpdate(patientId, {status: newStatus}, (err, updatedPatient) => {
        if (err) {
            // Handle the error
            res.status(500).send('An error occurred');
        } else {
            // Patient status updated successfully
            res.status(200).send('Patient status updated');
        }
    });
});


// app.post("/register", function(req, res) {
//     // Delete all existing doctors
//     Authentication.deleteMany({}, function(err) {
//         if (err) {
//             console.log(err);
//             res.redirect("/register");
//         } else {
//             // Create a new doctor document
//             Authentication.register(
//                 { username: req.body.username },
//                 req.body.password,
//                 function(err, doctor) {
//                     if (err) {
//                         console.log(err);
//                         res.redirect("/register");
//                     } else {
//                         passport.authenticate("local")(req, res, function() {
//                             res.redirect("/dashboard");
//                         });
//                     }
//                 }
//             );
//         }
//     });
// });


// Patient.updateMany(
//     {},
//     { $set: { lastVisit: [] } }
// )
//     .then((result) => {
//         console.log(`Updated ${result.nModified} patient records.`);
//     })
//     .catch((error) => {
//         console.error('Error updating patient records:', error);
//     });
// Contact.updateMany(
//     {},
//     { $set: { viewed: false } }
// )
//     .then((result) => {
//         console.log(`Updated ${result.nModified} contact records.`);
//     })
//     .catch((error) => {
//         console.error('Error updating contact records:', error);
//     });


//The app.listen() function is used to start the server and make it listen on a specific port for incoming HTTP requests.
app.listen(3000, function () {
    console.log("Server started on port 3000");
});
