import React from 'react';
import { useStore } from '../store/useStore';
import { api } from '../utils/api';
import { GlassButton } from './GlassButton';
import { 
  Code2, Sparkles, Binary, Cpu, Layers, ArrowRight 
} from 'lucide-react';

interface TemplatesViewProps {
  setView: (view: 'dashboard' | 'workspace') => void;
}

export const TemplatesView: React.FC<TemplatesViewProps> = ({ setView }) => {
  const { addProjectLocal, setActiveProject } = useStore();

  const templates = [
    {
      id: 'dijkstra-py',
      name: 'Dijkstra Shortest Path',
      language: 'python',
      description: 'Graph algorithm implementing priority queue shortest path tracking.',
      icon: Binary,
      color: 'from-yellow-500/20 to-orange-500/20 text-yellow-300 border-yellow-500/30',
      code: `import heapq

def dijkstra(graph, start):
    distances = {node: float('infinity') for node in graph}
    distances[start] = 0
    pq = [(0, start)]

    while pq:
        current_dist, current_node = heapq.heappop(pq)
        if current_dist > distances[current_node]:
            continue

        for neighbor, weight in graph[current_node].items():
            distance = current_dist + weight
            if distance < distances[neighbor]:
                distances[neighbor] = distance
                heapq.heappush(pq, (distance, neighbor))

    return distances

graph = {
    'A': {'B': 4, 'C': 2},
    'B': {'A': 4, 'C': 1, 'D': 5},
    'C': {'A': 2, 'B': 1, 'D': 8, 'E': 10},
    'D': {'B': 5, 'C': 8, 'E': 2},
    'E': {'C': 10, 'D': 2}
}

print("Shortest distances from A:", dijkstra(graph, 'A'))
`
    },
    {
      id: 'binary-search-tree-java',
      name: 'Binary Search Tree & Traversal',
      language: 'java',
      description: 'Java OOP BST class with in-order, pre-order, and post-order traversals.',
      icon: Layers,
      color: 'from-red-500/20 to-pink-500/20 text-red-300 border-red-500/30',
      code: `class TreeNode {
    int val;
    TreeNode left, right;
    TreeNode(int val) {
        this.val = val;
    }
}

public class Main {
    public static void inOrder(TreeNode root) {
        if (root == null) return;
        inOrder(root.left);
        System.out.print(root.val + " ");
        inOrder(root.right);
    }

    public static void main(String[] args) {
        TreeNode root = new TreeNode(10);
        root.left = new TreeNode(5);
        root.right = new TreeNode(15);
        
        System.out.print("In-Order Traversal: ");
        inOrder(root);
        System.out.println();
    }
}
`
    },
    {
      id: 'lru-cache-cpp',
      name: 'LRU Cache Design (C++)',
      language: 'cpp',
      description: 'Optimal O(1) Least Recently Used cache using std::list and std::unordered_map.',
      icon: Cpu,
      color: 'from-blue-500/20 to-cyan-500/20 text-blue-300 border-blue-500/30',
      code: `#include <iostream>
#include <unordered_map>
#include <list>

using namespace std;

class LRUCache {
    int capacity;
    list<pair<int, int>> cacheList;
    unordered_map<int, list<pair<int, int>>::iterator> cacheMap;

public:
    LRUCache(int cap) : capacity(cap) {}

    int get(int key) {
        if (cacheMap.find(key) == cacheMap.end()) return -1;
        cacheList.splice(cacheList.begin(), cacheList, cacheMap[key]);
        return cacheMap[key]->second;
    }

    void put(int key, int value) {
        if (cacheMap.find(key) != cacheMap.end()) {
            cacheMap[key]->second = value;
            cacheList.splice(cacheList.begin(), cacheList, cacheMap[key]);
            return;
        }
        if (cacheList.size() == capacity) {
            int delKey = cacheList.back().first;
            cacheList.pop_back();
            cacheMap.erase(delKey);
        }
        cacheList.push_front({key, value});
        cacheMap[key] = cacheList.begin();
    }
};

int main() {
    LRUCache lru(2);
    lru.put(1, 100);
    lru.put(2, 200);
    cout << "Get 1: " << lru.get(1) << endl;
    return 0;
}
`
    },
    {
      id: 'async-worker-js',
      name: 'Async Pipeline & Events (JS)',
      language: 'javascript',
      description: 'JavaScript Promises, Event Loop, and Stream Batch Pipeline processing.',
      icon: Code2,
      color: 'from-yellow-400/20 to-amber-500/20 text-yellow-200 border-yellow-400/30',
      code: `async function processBatch(items) {
  console.log("Starting async pipeline batch...");
  const results = await Promise.all(
    items.map(async (item) => {
      await new Promise((r) => setTimeout(r, 100));
      return item * 2;
    })
  );
  return results;
}

processBatch([10, 20, 30, 40]).then((res) => {
  console.log("Pipeline Output:", res);
});
`
    }
  ];

  const handleUseTemplate = async (template: typeof templates[0]) => {
    try {
      const proj = await api.projects.create(template.name, template.description, template.language);
      
      // Update main file content
      if (proj.files && proj.files.length > 0) {
        await api.projects.saveFile(proj.id, {
          id: proj.files[0].id,
          name: proj.files[0].name,
          path: proj.files[0].path,
          content: template.code
        });
        proj.files[0].content = template.code;
      }

      addProjectLocal(proj);
      setActiveProject(proj);
      setView('workspace');
    } catch (err: any) {
      alert('Failed to instantiate template: ' + err.message);
    }
  };

  return (
    <div className="flex-1 p-6 md:p-10 overflow-y-auto h-screen max-w-7xl mx-auto select-none bg-dark-300">
      <div className="flex justify-between items-center mb-10 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-2">
            <Sparkles className="text-purple-400" /> Starter Code Templates
          </h1>
          <p className="text-slate-500 text-xs mt-1.5 font-medium">Instantiate production-ready algorithm & data structure sandboxes.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {templates.map((tpl) => {
          const Icon = tpl.icon;
          return (
            <div key={tpl.id} className="glass-card p-6 rounded-2xl border border-white/10 hover:border-purple-500/40 transition-all duration-300 flex flex-col justify-between h-72">
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div className={`p-3 rounded-xl bg-gradient-to-br border ${tpl.color}`}>
                    <Icon size={22} />
                  </div>
                  <span className="text-[10px] uppercase font-bold px-2.5 py-1 rounded-full border border-white/10 text-slate-300">
                    {tpl.language.toUpperCase()}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{tpl.name}</h3>
                <p className="text-slate-400 text-xs leading-relaxed line-clamp-2">{tpl.description}</p>
              </div>

              <div className="mt-4 pt-4 border-t border-white/5 flex justify-end">
                <GlassButton variant="primary" onClick={() => handleUseTemplate(tpl)} className="px-4 py-2 text-xs font-bold flex items-center gap-2">
                  Launch Template <ArrowRight size={14} />
                </GlassButton>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
