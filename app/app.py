from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import pandas as pd

app = Flask(__name__)
CORS(app)


model = joblib.load('../models/depression_model.pkl')

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json()

        
        input_data = pd.DataFrame([data])

        
        prediction = model.predict(input_data)[0]

        
        probabilities = model.predict_proba(input_data).tolist()[0]

        
        label_mapping = {
            0: 'No Depression',
            1: 'Mild',
            2: 'Moderate',
            3: 'Moderately Severe',
            4: 'Severe'
        }

        
        probability_dict = {str(i): float(probabilities[i]) for i in range(len(probabilities))}

        return jsonify({
            "result": label_mapping.get(prediction, "Unknown"),
            "probability": probability_dict
        })

    except Exception as e:
        return jsonify({"error": str(e)})

if __name__ == '__main__':
    app.run(debug=True)
