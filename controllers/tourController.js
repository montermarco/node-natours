const Tour = require('./../models/tourModel');
const APIFeatures = require('./../utils/apiFeatures');

exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};

exports.getAllTours = async (req, res) => {
  try {
    // BUILD QUERY
    const features = new APIFeatures(Tour.find(), req.query)
      .filter()
      .sort()
      .limit()
      .paginate();

    const tours = await features.query;

    //SEND STATUS
    res.status(200).json({
      status: 'success',
      results: tours.length,
      data: {
        tours
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'Fail',
      message: error
    });
  }
};

exports.getOneTour = async (req, res) => {
  try {
    const tour = await Tour.findById(req.params.id);
    res.status(200).json({
      status: 'success',
      data: {
        tour
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'Fail',
      message: error
    });
  }
};

exports.createTour = async (req, res) => {
  try {
    const newTour = await Tour.create(req.body);

    res.status(200).json({
      status: 'Success',
      data: {
        tour: newTour
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'Failed',
      message: error
    });
  }
};

exports.updateTour = async (req, res) => {
  try {
    const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      status: 'success',
      data: {
        tour
      }
    });
  } catch (error) {
    res.status(404).json({
      status: 'Fail',
      message: error
    });
  }
};

exports.deleteTour = async (req, res) => {
  try {
    await Tour.findByIdAndDelete(req.params.id);
    res.status(204).json({
      status: 'Sucess',
      data: null
    });
  } catch (error) {
    res.status(404).json({
      status: 'Fail',
      message: error
    });
  }
};
// AGREGATIONNN PIPELINE MATCHING & GROUPING
exports.getTourStats = async (req, res) => {
  try {
    const stats = await Tour.aggregate([
      {
        $match: { ratingsAverage: { $gte: 4.5 } }
      },
      {
        $group: {
          _id: null,
          numRatings: { $sum: '$ratingsQuantity' },
          avgRating: { $avg: '$ratingsAverage' },
          avgPrice: { $avg: '$price' },
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' }
        }
      }
    ]);

    res.status(200).json({
      status: 'Success',
      data: {
        stats
      }
    });
  } catch (error) {
    res.status(204).json({
      status: 'Fail',
      message: error
    });
  }
};

//UNNWIND AND PROJECTING
exports.getMonthlyStats = async (req, res) => {
  try {
    const year = req.params.year * 1; // (*1) to convert it to a number
    const stat = await Tour.aggregate([
      {
        $unwind: '$startDates' // create a new document for each startdate in a tour
      },
      {
        $match: {
          startDates: {
            //selecting the months of the given year, but still returns the whole object
            $gte: new Date(`${year}-01-01`),
            $lte: new Date(`${year}-12-31`)
          }
        }
      },
      {
        //Processing the selected/filtered data
        $group: {
          // extracting the month from the startDate, return the _id with the month number assigned to it
          _id: { $month: '$startDates' },
          //counting the months
          numToursMonth: { $sum: 1 },
          //adding the matchinng tours name to an array
          tours: { $push: '$name' }
        }
      },
      {
        // Addinng a new field with the month
        $addFields: { month: '$_id' }
      },
      {
        // Hiding the _id
        $project: { _id: 0 }
      },
      {
        // Sorting by month
        $sort: { month: 1 }
      }
    ]);

    res.status(200).json({
      status: 'Success',
      data: { stat }
    });
  } catch (error) {
    res.status(204).json({
      status: 'Fail',
      message: error
    });
  }
};
