# Business Data Visualizer

A powerful data visualization system that uses AI to analyze data and generate interactive visualizations. The system automatically processes CSV/Excel files, creates optimized MongoDB schemas, and generates visualization recommendations using Google's Gemini AI.

## Features

- Automatic data analysis and schema generation
- AI-powered visualization recommendations
- MongoDB integration with optimized schemas
- RESTful API for frontend integration
- Support for CSV and Excel files
- Interactive visualization generation
- Comprehensive logging system

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- Google Gemini API key

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/business-data-visualizer.git
cd business-data-visualizer
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file:
```bash
cp .env.example .env
```

4. Update the `.env` file with your configuration:
- Set your MongoDB connection string
- Add your Gemini API key
- Configure other settings as needed

## Usage

1. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

2. The server will start on port 3000 (or your configured port)

## API Endpoints

### POST /api/analyze
Analyze a data file and generate visualizations.

Request body:
```json
{
    "filePath": "path/to/your/file.csv",
    "sampleSize": 100
}
```

### GET /api/collections
List all available collections in the database.

### GET /api/collections/:name
Get information about a specific collection.

## Project Structure

```
src/
├── index.js              # Main application file
├── utils/
│   ├── dbHandler.js      # MongoDB operations
│   ├── fileLoader.js     # File processing
│   ├── geminiInterface.js # Gemini AI integration
│   └── logger.js         # Logging utility
```

## Error Handling

The system uses Winston for logging and provides detailed error information. Logs are stored in the `logs/` directory:
- `error.log`: Contains only error messages
- `combined.log`: Contains all log messages

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Google Gemini AI
- MongoDB
- Express.js
- Apache ECharts 