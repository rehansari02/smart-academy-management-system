const { State, City } = require('../models/Location');
const asyncHandler = require('express-async-handler');

// --- STATE CONTROLLERS ---

// @desc    Get all states
// @route   GET /api/master/location/states
// @access  Public (for public forms like contact, online admission)
const getStates = asyncHandler(async (req, res) => {
    const states = await State.find({ isDeleted: false, isActive: true })
        .sort({ name: 1 })
        .select('-isDeleted');
    res.json(states);
});

// @desc    Create new state
// @route   POST /api/master/location/states
// @access  Private
const createState = asyncHandler(async (req, res) => {
    const { name } = req.body;

    // Check if state already exists
    const existingState = await State.findOne({ 
        name: { $regex: new RegExp(`^${name}$`, 'i') }, 
        isDeleted: false 
    });

    if (existingState) {
        res.status(400);
        throw new Error('State already exists');
    }

    const state = await State.create({ name });
    res.status(201).json(state);
});

// @desc    Update state
// @route   PUT /api/master/location/states/:id
// @access  Private
const updateState = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const state = await State.findById(id);

    if (!state || state.isDeleted) {
        res.status(404);
        throw new Error('State not found');
    }

    // Check if new name conflicts with existing state
    if (req.body.name && req.body.name !== state.name) {
        const existingState = await State.findOne({
            name: { $regex: new RegExp(`^${req.body.name}$`, 'i') },
            isDeleted: false,
            _id: { $ne: id }
        });

        if (existingState) {
            res.status(400);
            throw new Error('State name already exists');
        }
    }

    const updatedState = await State.findByIdAndUpdate(id, req.body, { new: true });
    res.json(updatedState);
});

// @desc    Delete state (soft delete)
// @route   DELETE /api/master/location/states/:id
// @access  Private
const deleteState = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const state = await State.findById(id);

    if (!state || state.isDeleted) {
        res.status(404);
        throw new Error('State not found');
    }

    // Soft delete the state
    state.isDeleted = true;
    await state.save();

    // Also soft delete all cities in this state
    await City.updateMany(
        { stateId: id, isDeleted: false },
        { isDeleted: true }
    );

    res.json({ id, message: 'State and associated cities deleted successfully' });
});

// --- CITY CONTROLLERS ---

// @desc    Get all cities (optionally filtered by state)
// @route   GET /api/master/location/cities?stateId=xyz
// @access  Public (for public forms like contact, online admission)
const getCities = asyncHandler(async (req, res) => {
    const { stateId } = req.query;
    let query = { isDeleted: false, isActive: true };

    if (stateId) {
        query.stateId = stateId;
    }

    const cities = await City.find(query)
        .populate('stateId', 'name')
        .sort({ name: 1 })
        .select('-isDeleted');
    
    res.json(cities);
});

// @desc    Create new city
// @route   POST /api/master/location/cities
// @access  Private
const createCity = asyncHandler(async (req, res) => {
    const { name, stateId } = req.body;

    if (!stateId) {
        res.status(400);
        throw new Error('State is required');
    }

    // Verify state exists
    const state = await State.findOne({ _id: stateId, isDeleted: false });
    if (!state) {
        res.status(404);
        throw new Error('State not found');
    }

    // Check if city already exists in this state
    const existingCity = await City.findOne({
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        stateId,
        isDeleted: false
    });

    if (existingCity) {
        res.status(400);
        throw new Error('City already exists in this state');
    }

    const city = await City.create({ name, stateId });
    const populatedCity = await City.findById(city._id).populate('stateId', 'name');
    
    res.status(201).json(populatedCity);
});

// @desc    Update city
// @route   PUT /api/master/location/cities/:id
// @access  Private
const updateCity = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const city = await City.findById(id);

    if (!city || city.isDeleted) {
        res.status(404);
        throw new Error('City not found');
    }

    // If updating stateId, verify it exists
    if (req.body.stateId) {
        const state = await State.findOne({ _id: req.body.stateId, isDeleted: false });
        if (!state) {
            res.status(404);
            throw new Error('State not found');
        }
    }

    // Check if new name conflicts within the same state
    if (req.body.name || req.body.stateId) {
        const checkStateId = req.body.stateId || city.stateId;
        const checkName = req.body.name || city.name;

        const existingCity = await City.findOne({
            name: { $regex: new RegExp(`^${checkName}$`, 'i') },
            stateId: checkStateId,
            isDeleted: false,
            _id: { $ne: id }
        });

        if (existingCity) {
            res.status(400);
            throw new Error('City name already exists in this state');
        }
    }

    const updatedCity = await City.findByIdAndUpdate(id, req.body, { new: true })
        .populate('stateId', 'name');
    
    res.json(updatedCity);
});

// @desc    Delete city (soft delete)
// @route   DELETE /api/master/location/cities/:id
// @access  Private
const deleteCity = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const city = await City.findById(id);

    if (!city || city.isDeleted) {
        res.status(404);
        throw new Error('City not found');
    }

    city.isDeleted = true;
    await city.save();

    res.json({ id, message: 'City deleted successfully' });
});

module.exports = {
    getStates,
    createState,
    updateState,
    deleteState,
    getCities,
    createCity,
    updateCity,
    deleteCity
};
