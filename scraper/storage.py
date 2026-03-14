import pandas as pd

def save_places(places, filename="places.csv"):

    df = pd.DataFrame(places)

    df.drop_duplicates(subset=["place_id", "place_path"], inplace=True)

    df.to_csv(filename, index=False)
