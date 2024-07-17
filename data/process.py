import csv
import json
from collections import defaultdict
import random
import networkx as nx

"""Initial data process: Read and reformat the data structure and save to combined user data json file from original csv file"""
user_total = defaultdict(lambda: {'check_in_time': [], 'location': [], 'location_id': [], 'connections': []})
with open('user_total_checkin.csv', 'r') as file:
    reader = csv.DictReader(file)
    for row in reader:
        user_id = int(row['user'])
        user_total[user_id]['user_id'] = user_id
        user_total[user_id]['check_in_time'].append(row['check_in_time'])
        user_total[user_id]['location'].append({
            'latitude': float(row['latitude']),
            'longitude': float(row['longitude'])
        })
        user_total[user_id]['location_id'].append(int(row['location_id']))

with open('user_edges.csv', 'r') as file:
    reader = csv.DictReader(file)
    for row in reader:
        user_source = int(row['user_source'])
        user_target = int(row['user_target'])
        user_total[user_source]['connections'].append(user_target)

result = list(user_total.values())

with open('combined_user_data.json', 'w') as file:
    json.dump(result, file, indent=4)

def sample_data_with_connections(input_file, output_file, sample_size):
    """Second data process: Extract 100 sampled data with top connections and valid user id from combined user data json file"""
    with open(input_file, 'r') as f:
        combined_data = json.load(f)

    nodes_with_connections = [node for node in combined_data if node.get('connections') and node.get('user_id')]
    if len(nodes_with_connections) < sample_size:
        raise ValueError("Not enough nodes with connections to sample the requested amount.")
    
    nodes_with_connections.sort(key=lambda x: len(x['connections']), reverse=True)

    def get_sample_with_variety(nodes, sample_size):
        sampled_nodes = []
        step = len(nodes) // sample_size
        for i in range(0, len(nodes), step):
            if len(sampled_nodes) < sample_size:
                sampled_nodes.append(nodes[i])
        return sampled_nodes[:sample_size]

    sampled_nodes = get_sample_with_variety(nodes_with_connections, sample_size)

    #Sample nodes with connections
    #sampled_nodes = random.sample(nodes_with_connections[:2*sample_size], sample_size)

    # Ensure that all connections in the sampled nodes are within the sample
    sampled_node_ids = {node['user_id'] for node in sampled_nodes}
    valid_links = []

    for node in sampled_nodes:
        valid_connections = [conn for conn in node['connections'] if conn in sampled_node_ids]
        node['connections'] = valid_connections
        for conn in valid_connections:
            valid_links.append({'source': node['user_id'], 'target': conn})

    # Check if we have enough links, if not, resample
    attempt = 0
    max_attempts = 10
    while len(valid_links) < sample_size and attempt < max_attempts:
        attempt += 1
        print(f"Attempt {attempt}: Not enough links, resampling...")
        sampled_nodes = random.sample(nodes_with_connections[:2*sample_size], sample_size)
        sampled_node_ids = {node['user_id'] for node in sampled_nodes}
        valid_links = []

        for node in sampled_nodes:
            valid_connections = [conn for conn in node['connections'] if conn in sampled_node_ids]
            node['connections'] = valid_connections
            for conn in valid_connections:
                valid_links.append({'source': node['user_id'], 'target': conn})

    # Save the sampled data to a new JSON file
    #with open(output_file, 'w') as f:
    #    json.dump(sampled_nodes, f, indent=4)

input_file = 'combined_user_data.json'
output_file = 'sampled_combined_user_data.json'

# Sample 100 nodes with connections due to large number affect graph rendering on the page
sample_size = 100
sample_data_with_connections(input_file, output_file, sample_size)

def getClusterCoefficient():
    """Data process: Calculate clustering coefficients from the sampled 100 nodes with higher connection density"""
    with open("sampled_combined_user_data.json", 'r') as f:
        combined_data = json.load(f)
        Graph = nx.Graph()
        for node in combined_data:
            Graph.add_node(node['user_id'])
            for conn in node['connections']:
                Graph.add_edge(node['user_id'], conn)
        
        cluster_coefficients = nx.clustering(Graph)
        avg_cluster_coefficient = sum(cluster_coefficients.values()) / len(cluster_coefficients)
        print(f"Average clustering coefficient: {avg_cluster_coefficient}") #48.909

getClusterCoefficient()