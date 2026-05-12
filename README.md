# Minima

> The invisible mechanics of Machine Learning, made visible.

Minima is an open-source, interactive educational platform designed to strip away the "black box" abstraction of Machine Learning. It provides pure geometric intuition through tactile, client-side visualizations. 

From the Classical era of K-Means and Decision Trees to the Modern era of Generative AI, Minima bridges the gap between theoretical math and visual understanding.

## Features

* **Interactive Sandboxes:** Algorithms aren't just explained; they are simulated. Users can drag data points, adjust hyperparameters, and watch models converge in real-time.
* **Pure SVG Architecture:** Built without heavy charting libraries. Visualizations are rendered using pure React state and native SVG for 60fps performance and zero bloat.
* **MDX Curriculum:** Educational content and interactive components are seamlessly woven together using Next.js App Router and MDX.
* **Minimalist Design:** An "Apple-tier", typography-driven dark mode aesthetic powered by Tailwind CSS.

## The Architecture (4 Eras)

Minima structures the history and mechanics of Machine Learning into four distinct eras:

1. **The Classical Era:** Geometry and distance (e.g., K-Means, KNN, Linear Regression).
2. **The Tree Era:** Logic and ensemble decisions (e.g., Random Forests, XGBoost).
3. **The Neural Era:** Weights, biases, and deep learning topologies (e.g., CNNs, MLPs).
4. **The Modern Era:** Attention mechanisms and latent space (e.g., Transformers, Diffusion).

## Tech Stack

* **Framework:** Next.js 15 (App Router)
* **Language:** TypeScript
* **Styling:** Tailwind CSS
* **Content:** MDX (`next-mdx-remote`)
* **Math/Geometry:** `d3-delaunay` (strictly for coordinate calculation, zero DOM manipulation)

## Getting Started

To run Minima locally:

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/minima.git
```
2. Navigate to the directory and install dependencies:
```
cd minima
npm install

```
3. Start the development server:
```npm run dev```

4. Open http://localhost:3000 in your browser


## Contributing
Minima is designed to be highly modular. Adding a new topic is as simple as creating an MDX file and building an isolated visualization component.

Content: Add a new ```.mdx``` file to the appropriate era in ```/content```.

Visualizer: Build your interactive component in ```/components/visualizations```.

Rule of Thumb: Keep it lightweight. Avoid external charting dependencies unless strictly mathematically necessary. Rely on React state and CSS transitions.

## License
This project is licensed under the MIT License - see the LICENSE file for details.