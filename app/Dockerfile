#Use offcial python base image
FROM python:3.10-slim

#Set you work directory
WORKDIR /app

#Copy requirements to work directory and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

#Copy your source code to work directory
COPY . .

#Expose your port
EXPOSE 5432

#Run the app
CMD [ "python", "app.py" ]